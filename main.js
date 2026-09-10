"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => DraftavaCompanionPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var import_node_buffer = require("node:buffer");
var import_node_child_process = require("node:child_process");
var import_node_crypto = require("node:crypto");
var import_node_fs = require("node:fs");
var import_node_os = require("node:os");
var import_node_path = require("node:path");
var DEBUG_DRAFTAVA_APP = "/Applications/Draftava.app";
var DraftavaCompanionPlugin = class extends import_obsidian.Plugin {
  floatingActionEl = null;
  async onload() {
    this.registerSingleFileMenu();
    this.registerMultiFileMenu();
    this.registerFloatingCaptureActions();
    new import_obsidian.Notice(
      "Draftava Companion loaded"
    );
  }
  /*
     Obsidian currently emits editor-menu and
     files-menu at runtime.
  
     files-menu is not cleanly represented in all
     published TypeScript declaration versions, so
     this prototype intentionally keeps the runtime
     event bridge untyped rather than inventing
     conflicting overloads.
    */
  runtimeWorkspace() {
    return this.app.workspace;
  }
  registerSingleFileMenu() {
    this.registerEvent(
      this.app.workspace.on(
        "file-menu",
        (menu, file) => {
          if (!(file instanceof import_obsidian.TFile)) {
            return;
          }
          const isMarkdown = file.extension.toLowerCase() === "md";
          const isImage = this.isSupportedImageFile(
            file
          );
          if (!isMarkdown && !isImage) {
            return;
          }
          menu.addItem(
            (item) => {
              item.setTitle(
                "Send to Draftava"
              ).setIcon("send").onClick(
                async () => {
                  const idea = isImage ? await this.ideaFromImageFile(
                    file
                  ) : await this.ideaFromFile(
                    file
                  );
                  if (idea) {
                    this.sendPayload([
                      idea
                    ]);
                  }
                }
              );
            }
          );
        }
      )
    );
  }
  registerMultiFileMenu() {
    const workspace = this.runtimeWorkspace();
    this.registerEvent(
      workspace.on(
        "files-menu",
        (menu, files) => {
          const notes = files.filter(
            (file) => file instanceof import_obsidian.TFile && file.extension.toLowerCase() === "md"
          );
          if (notes.length < 2) {
            return;
          }
          menu.addItem(
            (item) => {
              item.setTitle(
                "Send to Draftava"
              ).setIcon("send").onClick(
                async () => {
                  const ideas = await Promise.all(
                    notes.map(
                      (file) => this.ideaFromFile(
                        file
                      )
                    )
                  );
                  this.sendPayload(
                    ideas
                  );
                }
              );
            }
          );
        }
      )
    );
  }
  registerFloatingCaptureActions() {
    this.registerDomEvent(
      document,
      "mouseup",
      () => {
        window.setTimeout(
          () => this.showTextSelectionAction(),
          0
        );
      }
    );
    this.registerDomEvent(
      document,
      "keyup",
      (event) => {
        if (event.key === "Escape") {
          this.hideFloatingAction();
          return;
        }
        if (event.shiftKey || event.key.startsWith("Arrow")) {
          window.setTimeout(
            () => this.showTextSelectionAction(),
            0
          );
        }
      }
    );
    this.registerDomEvent(
      document,
      "click",
      (event) => {
        const target = event.target instanceof Element ? event.target : null;
        if (!target) {
          return;
        }
        if (this.floatingActionEl && this.floatingActionEl.contains(target)) {
          return;
        }
        const image = this.findClickedImage(target);
        if (!image) {
          return;
        }
        if (!image.closest(
          ".markdown-source-view, .markdown-preview-view"
        )) {
          return;
        }
        const x = event.clientX;
        const y = event.clientY;
        window.setTimeout(
          () => {
            this.showImageCaptureAction(
              image,
              x,
              y
            );
          },
          0
        );
      }
    );
    this.registerDomEvent(
      document,
      "pointerdown",
      (event) => {
        const target = event.target instanceof Node ? event.target : null;
        if (target && this.floatingActionEl && this.floatingActionEl.contains(target)) {
          return;
        }
        this.hideFloatingAction();
      },
      true
    );
    window.addEventListener(
      "scroll",
      this.hideFloatingActionBound,
      true
    );
    window.addEventListener(
      "resize",
      this.hideFloatingActionBound
    );
    this.register(
      () => {
        window.removeEventListener(
          "scroll",
          this.hideFloatingActionBound,
          true
        );
        window.removeEventListener(
          "resize",
          this.hideFloatingActionBound
        );
        this.hideFloatingAction();
      }
    );
  }
  hideFloatingActionBound = () => {
    this.hideFloatingAction();
  };
  findClickedImage(start) {
    let element = start;
    while (element) {
      if (element instanceof HTMLImageElement) {
        return element;
      }
      element = element.parentElement;
    }
    return null;
  }
  getSelectionAnchorRect(view) {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      const clientRects = Array.from(
        range.getClientRects()
      ).filter(
        (rect) => rect.width > 0 && rect.height > 0
      );
      if (clientRects.length > 0) {
        return clientRects[clientRects.length - 1];
      }
      const boundingRect = range.getBoundingClientRect();
      if (boundingRect.width > 0 || boundingRect.height > 0) {
        return boundingRect;
      }
    }
    if (view) {
      const selectionRects = Array.from(
        view.containerEl.querySelectorAll(
          ".cm-selectionBackground"
        )
      ).map(
        (element) => element.getBoundingClientRect()
      ).filter(
        (rect) => rect.width > 0 && rect.height > 0
      );
      if (selectionRects.length > 0) {
        return selectionRects[selectionRects.length - 1];
      }
    }
    return null;
  }
  showTextSelectionAction() {
    const view = this.app.workspace.getActiveViewOfType(
      import_obsidian.MarkdownView
    );
    const editorSelection = view?.editor.getSelection() ?? "";
    const domSelection = window.getSelection()?.toString() ?? "";
    const selectedText = editorSelection.trim().length > 0 ? editorSelection : domSelection;
    if (selectedText.trim().length === 0) {
      this.hideFloatingAction();
      return;
    }
    const anchorRect = this.getSelectionAnchorRect(
      view
    );
    if (!anchorRect) {
      this.hideFloatingAction();
      return;
    }
    const activeFile = view?.file ?? this.app.workspace.getActiveFile();
    const requestedX = anchorRect.right - 68;
    const requestedY = anchorRect.top >= 38 ? anchorRect.top - 36 : anchorRect.bottom + 6;
    this.showFloatingAction(
      requestedX,
      requestedY,
      () => {
        this.sendPayload([
          {
            kind: "selection",
            content: selectedText,
            sourceTitle: activeFile?.basename,
            sourcePath: activeFile?.path
          }
        ]);
      }
    );
  }
  showImageCaptureAction(image, clickX, clickY) {
    const requestedX = clickX - 34;
    const requestedY = clickY >= 40 ? clickY - 38 : clickY + 10;
    this.showFloatingAction(
      requestedX,
      requestedY,
      () => {
        void this.sendClickedImage(
          image
        );
      }
    );
  }
  async sendClickedImage(image) {
    const sourceCandidates = [
      image.currentSrc,
      image.getAttribute("src"),
      image.getAttribute("data-src")
    ].filter(
      (value) => Boolean(value)
    );
    const remoteSource = sourceCandidates.find(
      (value) => value.startsWith("https://") || value.startsWith("http://")
    );
    let idea = null;
    if (remoteSource) {
      idea = await this.ideaFromRemoteImage(
        remoteSource
      );
    } else {
      const file = this.resolveImageFileFromElement(
        image,
        sourceCandidates
      );
      if (!file) {
        new import_obsidian.Notice(
          "Could not locate image in vault"
        );
        return;
      }
      idea = await this.ideaFromImageFile(
        file
      );
    }
    if (idea) {
      this.sendPayload([
        idea
      ]);
    }
  }
  resolveImageFileFromElement(image, sourceCandidates) {
    const candidates = [];
    const addCandidate = (raw) => {
      if (!raw) {
        return;
      }
      let value = raw;
      try {
        value = decodeURIComponent(
          value
        );
      } catch {
      }
      const queryIndex = value.indexOf("?");
      if (queryIndex >= 0) {
        value = value.substring(
          0,
          queryIndex
        );
      }
      const hashIndex = value.indexOf("#");
      if (hashIndex >= 0) {
        value = value.substring(
          0,
          hashIndex
        );
      }
      candidates.push(value);
    };
    for (const source of sourceCandidates) {
      addCandidate(source);
    }
    addCandidate(
      image.getAttribute("data-path")
    );
    addCandidate(
      image.getAttribute("alt")
    );
    const imageFiles = this.app.vault.getFiles().filter(
      (file) => this.isSupportedImageFile(
        file
      )
    );
    for (const candidate of candidates) {
      for (const file of imageFiles) {
        if (candidate === file.path || candidate.endsWith(
          "/" + file.path
        ) || candidate.endsWith(
          file.path
        )) {
          return file;
        }
      }
    }
    for (const candidate of candidates) {
      const filename = candidate.split("/").filter(Boolean).pop();
      if (!filename) {
        continue;
      }
      const matches = imageFiles.filter(
        (file) => file.name === filename
      );
      if (matches.length === 1) {
        return matches[0];
      }
    }
    return null;
  }
  showFloatingAction(requestedX, requestedY, action) {
    this.hideFloatingAction();
    const button = document.createElement(
      "button"
    );
    button.type = "button";
    button.className = "inzrt-capture-bubble";
    button.setAttribute(
      "aria-label",
      "Send to Draftava"
    );
    const icon = document.createElement(
      "span"
    );
    icon.className = "inzrt-capture-bubble-icon";
    (0, import_obsidian.setIcon)(
      icon,
      "send"
    );
    const label = document.createElement(
      "span"
    );
    label.className = "inzrt-capture-bubble-label";
    label.textContent = "Draftava";
    button.appendChild(
      icon
    );
    button.appendChild(
      label
    );
    button.addEventListener(
      "pointerdown",
      (event) => {
        event.preventDefault();
        event.stopPropagation();
      }
    );
    button.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.hideFloatingAction();
        action();
      }
    );
    document.body.appendChild(
      button
    );
    this.floatingActionEl = button;
    const rect = button.getBoundingClientRect();
    const margin = 8;
    const x = Math.max(
      margin,
      Math.min(
        requestedX,
        window.innerWidth - rect.width - margin
      )
    );
    const y = Math.max(
      margin,
      Math.min(
        requestedY,
        window.innerHeight - rect.height - margin
      )
    );
    button.style.left = `${x}px`;
    button.style.top = `${y}px`;
  }
  hideFloatingAction() {
    this.floatingActionEl?.remove();
    this.floatingActionEl = null;
  }
  isSupportedImageFile(file) {
    return [
      "png",
      "jpg",
      "jpeg",
      "webp",
      "gif",
      "heic",
      "heif",
      "tif",
      "tiff"
    ].includes(
      file.extension.toLowerCase()
    );
  }
  mimeTypeForExtension(extension) {
    switch (extension.toLowerCase()) {
      case "png":
        return "image/png";
      case "jpg":
      case "jpeg":
        return "image/jpeg";
      case "webp":
        return "image/webp";
      case "gif":
        return "image/gif";
      case "heic":
        return "image/heic";
      case "heif":
        return "image/heif";
      case "tif":
      case "tiff":
        return "image/tiff";
      default:
        return void 0;
    }
  }
  async ideaFromImageFile(file) {
    try {
      const data = await this.app.vault.readBinary(
        file
      );
      if (data.byteLength === 0) {
        throw new Error(
          "Image file is empty"
        );
      }
      return {
        kind: "image",
        image: {
          dataBase64: import_node_buffer.Buffer.from(data).toString(
            "base64"
          ),
          mimeType: this.mimeTypeForExtension(
            file.extension
          ),
          originalFileName: file.name
        },
        sourceTitle: file.basename,
        sourcePath: file.path
      };
    } catch (error) {
      console.error(
        "[Draftava Companion] local image read failed:",
        error
      );
      new import_obsidian.Notice(
        "Could not read image"
      );
      return null;
    }
  }
  async ideaFromRemoteImage(rawUrl) {
    try {
      const response = await (0, import_obsidian.requestUrl)({
        url: rawUrl,
        method: "GET",
        throw: false
      });
      if (response.status < 200 || response.status >= 300) {
        throw new Error(
          `HTTP ${response.status}`
        );
      }
      if (response.arrayBuffer.byteLength === 0) {
        throw new Error(
          "Downloaded image is empty"
        );
      }
      const contentTypeEntry = Object.entries(
        response.headers
      ).find(
        ([key]) => key.toLowerCase() === "content-type"
      );
      const responseMimeType = contentTypeEntry ? String(
        contentTypeEntry[1]
      ).split(";")[0].trim() : void 0;
      const parsed = new URL(
        rawUrl
      );
      const rawFileName = parsed.pathname.split("/").filter(Boolean).pop();
      const originalFileName = rawFileName ? decodeURIComponent(
        rawFileName
      ) : void 0;
      const extension = originalFileName?.split(".").pop()?.toLowerCase();
      const mimeType = responseMimeType?.toLowerCase().startsWith(
        "image/"
      ) ? responseMimeType : extension ? this.mimeTypeForExtension(
        extension
      ) : void 0;
      if (!mimeType) {
        throw new Error(
          "Downloaded resource is not a supported image"
        );
      }
      return {
        kind: "image",
        image: {
          dataBase64: import_node_buffer.Buffer.from(
            response.arrayBuffer
          ).toString(
            "base64"
          ),
          mimeType,
          originalFileName
        },
        sourceTitle: originalFileName,
        sourcePath: rawUrl
      };
    } catch (error) {
      console.error(
        "[Draftava Companion] remote image download failed:",
        error
      );
      new import_obsidian.Notice(
        "Could not download image"
      );
      return null;
    }
  }
  async ideaFromFile(file) {
    const markdown = await this.app.vault.cachedRead(file);
    const content = markdown.trim().length > 0 ? markdown : file.basename;
    return {
      kind: "note",
      content,
      sourceTitle: file.basename,
      sourcePath: file.path
    };
  }
  sendPayload(ideas) {
    if (ideas.length === 0) {
      return;
    }
    if (!(0, import_node_fs.existsSync)(
      DEBUG_DRAFTAVA_APP
    )) {
      new import_obsidian.Notice(
        "Draftava app is not available"
      );
      console.error(
        "[Draftava Companion] Missing app:",
        DEBUG_DRAFTAVA_APP
      );
      return;
    }
    try {
      const directory = (0, import_node_path.join)(
        (0, import_node_os.tmpdir)(),
        "inzrt-companion"
      );
      (0, import_node_fs.mkdirSync)(
        directory,
        {
          recursive: true
        }
      );
      const capturePath = (0, import_node_path.join)(
        directory,
        `${(0, import_node_crypto.randomUUID)()}.inzrtcapture`
      );
      const envelope = {
        version: 1,
        ideas
      };
      (0, import_node_fs.writeFileSync)(
        capturePath,
        JSON.stringify(
          envelope,
          null,
          2
        ),
        "utf8"
      );
      (0, import_node_child_process.execFile)(
        "/usr/bin/open",
        [
          "-a",
          DEBUG_DRAFTAVA_APP,
          capturePath
        ],
        (error) => {
          if (error) {
            console.error(
              "[Draftava Companion] open failed:",
              error
            );
            new import_obsidian.Notice(
              "Could not open Draftava"
            );
            return;
          }
          new import_obsidian.Notice(
            ideas.length === 1 ? "Sent to Draftava" : `Sent ${ideas.length} Ideas to Draftava`
          );
        }
      );
    } catch (error) {
      console.error(
        "[Draftava Companion] send failed:",
        error
      );
      new import_obsidian.Notice(
        "Could not send to Draftava"
      );
    }
  }
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB7XG4gIE1lbnUsXG4gIE1hcmtkb3duVmlldyxcbiAgTm90aWNlLFxuICBQbHVnaW4sXG4gIHJlcXVlc3RVcmwsXG4gIHNldEljb24sXG4gIFRBYnN0cmFjdEZpbGUsXG4gIFRGaWxlXG59IGZyb20gXCJvYnNpZGlhblwiO1xuXG5pbXBvcnQge1xuICBCdWZmZXJcbn0gZnJvbSBcIm5vZGU6YnVmZmVyXCI7XG5cbmltcG9ydCB7XG4gIGV4ZWNGaWxlXG59IGZyb20gXCJub2RlOmNoaWxkX3Byb2Nlc3NcIjtcblxuaW1wb3J0IHtcbiAgcmFuZG9tVVVJRFxufSBmcm9tIFwibm9kZTpjcnlwdG9cIjtcblxuaW1wb3J0IHtcbiAgZXhpc3RzU3luYyxcbiAgbWtkaXJTeW5jLFxuICB3cml0ZUZpbGVTeW5jXG59IGZyb20gXCJub2RlOmZzXCI7XG5cbmltcG9ydCB7XG4gIHRtcGRpclxufSBmcm9tIFwibm9kZTpvc1wiO1xuXG5pbXBvcnQge1xuICBqb2luXG59IGZyb20gXCJub2RlOnBhdGhcIjtcblxuXG5jb25zdCBERUJVR19EUkFGVEFWQV9BUFAgPVxuICBcIi9BcHBsaWNhdGlvbnMvRHJhZnRhdmEuYXBwXCI7XG5cblxuaW50ZXJmYWNlIENhcHR1cmVJbWFnZSB7XG4gIGRhdGFCYXNlNjQ6IHN0cmluZztcbiAgbWltZVR5cGU/OiBzdHJpbmc7XG4gIG9yaWdpbmFsRmlsZU5hbWU/OiBzdHJpbmc7XG59XG5cblxuaW50ZXJmYWNlIENhcHR1cmVJZGVhIHtcbiAga2luZDpcbiAgICB8IFwic2VsZWN0aW9uXCJcbiAgICB8IFwibm90ZVwiXG4gICAgfCBcImltYWdlXCI7XG5cbiAgY29udGVudD86IHN0cmluZztcbiAgaW1hZ2U/OiBDYXB0dXJlSW1hZ2U7XG4gIHNvdXJjZVRpdGxlPzogc3RyaW5nO1xuICBzb3VyY2VQYXRoPzogc3RyaW5nO1xufVxuXG5cbmludGVyZmFjZSBDYXB0dXJlRW52ZWxvcGUge1xuICB2ZXJzaW9uOiAxO1xuICBpZGVhczogQ2FwdHVyZUlkZWFbXTtcbn1cblxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBEcmFmdGF2YUNvbXBhbmlvblBsdWdpblxuICBleHRlbmRzIFBsdWdpblxue1xuICBwcml2YXRlIGZsb2F0aW5nQWN0aW9uRWw6XG4gICAgSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcblxuICBhc3luYyBvbmxvYWQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy5yZWdpc3RlclNpbmdsZUZpbGVNZW51KCk7XG4gICAgdGhpcy5yZWdpc3Rlck11bHRpRmlsZU1lbnUoKTtcbiAgICB0aGlzLnJlZ2lzdGVyRmxvYXRpbmdDYXB0dXJlQWN0aW9ucygpO1xuXG4gICAgbmV3IE5vdGljZShcbiAgICAgIFwiRHJhZnRhdmEgQ29tcGFuaW9uIGxvYWRlZFwiXG4gICAgKTtcbiAgfVxuXG5cbiAgLypcbiAgIE9ic2lkaWFuIGN1cnJlbnRseSBlbWl0cyBlZGl0b3ItbWVudSBhbmRcbiAgIGZpbGVzLW1lbnUgYXQgcnVudGltZS5cblxuICAgZmlsZXMtbWVudSBpcyBub3QgY2xlYW5seSByZXByZXNlbnRlZCBpbiBhbGxcbiAgIHB1Ymxpc2hlZCBUeXBlU2NyaXB0IGRlY2xhcmF0aW9uIHZlcnNpb25zLCBzb1xuICAgdGhpcyBwcm90b3R5cGUgaW50ZW50aW9uYWxseSBrZWVwcyB0aGUgcnVudGltZVxuICAgZXZlbnQgYnJpZGdlIHVudHlwZWQgcmF0aGVyIHRoYW4gaW52ZW50aW5nXG4gICBjb25mbGljdGluZyBvdmVybG9hZHMuXG4gICovXG4gIHByaXZhdGUgcnVudGltZVdvcmtzcGFjZSgpOiBhbnkge1xuICAgIHJldHVybiB0aGlzLmFwcC53b3Jrc3BhY2U7XG4gIH1cblxuXG4gIHByaXZhdGUgcmVnaXN0ZXJTaW5nbGVGaWxlTWVudSgpOlxuICAgIHZvaWRcbiAge1xuICAgIHRoaXMucmVnaXN0ZXJFdmVudChcbiAgICAgIHRoaXMuYXBwLndvcmtzcGFjZS5vbihcbiAgICAgICAgXCJmaWxlLW1lbnVcIixcbiAgICAgICAgKFxuICAgICAgICAgIG1lbnU6IE1lbnUsXG4gICAgICAgICAgZmlsZTogVEFic3RyYWN0RmlsZVxuICAgICAgICApID0+IHtcbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAhKGZpbGUgaW5zdGFuY2VvZiBURmlsZSlcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBjb25zdCBpc01hcmtkb3duID1cbiAgICAgICAgICAgIGZpbGUuZXh0ZW5zaW9uXG4gICAgICAgICAgICAgIC50b0xvd2VyQ2FzZSgpXG4gICAgICAgICAgICAgID09PSBcIm1kXCI7XG5cbiAgICAgICAgICBjb25zdCBpc0ltYWdlID1cbiAgICAgICAgICAgIHRoaXMuaXNTdXBwb3J0ZWRJbWFnZUZpbGUoXG4gICAgICAgICAgICAgIGZpbGVcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAhaXNNYXJrZG93blxuICAgICAgICAgICAgJiZcbiAgICAgICAgICAgICFpc0ltYWdlXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbWVudS5hZGRJdGVtKFxuICAgICAgICAgICAgKGl0ZW0pID0+IHtcbiAgICAgICAgICAgICAgaXRlbVxuICAgICAgICAgICAgICAgIC5zZXRUaXRsZShcbiAgICAgICAgICAgICAgICAgIFwiU2VuZCB0byBEcmFmdGF2YVwiXG4gICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgIC5zZXRJY29uKFwic2VuZFwiKVxuICAgICAgICAgICAgICAgIC5vbkNsaWNrKFxuICAgICAgICAgICAgICAgICAgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpZGVhID1cbiAgICAgICAgICAgICAgICAgICAgICBpc0ltYWdlXG4gICAgICAgICAgICAgICAgICAgICAgICA/IGF3YWl0IHRoaXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAuaWRlYUZyb21JbWFnZUZpbGUoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgICAgICAgICAgOiBhd2FpdCB0aGlzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLmlkZWFGcm9tRmlsZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgICAgICAgICBpZGVhXG4gICAgICAgICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2VuZFBheWxvYWQoW1xuICAgICAgICAgICAgICAgICAgICAgICAgaWRlYVxuICAgICAgICAgICAgICAgICAgICAgIF0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICApXG4gICAgKTtcbiAgfVxuXG5cbiAgcHJpdmF0ZSByZWdpc3Rlck11bHRpRmlsZU1lbnUoKTpcbiAgICB2b2lkXG4gIHtcbiAgICBjb25zdCB3b3Jrc3BhY2U6IGFueSA9XG4gICAgICB0aGlzLnJ1bnRpbWVXb3Jrc3BhY2UoKTtcblxuICAgIHRoaXMucmVnaXN0ZXJFdmVudChcbiAgICAgIHdvcmtzcGFjZS5vbihcbiAgICAgICAgXCJmaWxlcy1tZW51XCIsXG4gICAgICAgIChcbiAgICAgICAgICBtZW51OiBNZW51LFxuICAgICAgICAgIGZpbGVzOiBUQWJzdHJhY3RGaWxlW11cbiAgICAgICAgKSA9PiB7XG4gICAgICAgICAgY29uc3Qgbm90ZXMgPVxuICAgICAgICAgICAgZmlsZXMuZmlsdGVyKFxuICAgICAgICAgICAgICAoXG4gICAgICAgICAgICAgICAgZmlsZVxuICAgICAgICAgICAgICApOiBmaWxlIGlzIFRGaWxlID0+XG4gICAgICAgICAgICAgICAgZmlsZSBpbnN0YW5jZW9mIFRGaWxlXG4gICAgICAgICAgICAgICAgJiZcbiAgICAgICAgICAgICAgICBmaWxlLmV4dGVuc2lvblxuICAgICAgICAgICAgICAgICAgLnRvTG93ZXJDYXNlKClcbiAgICAgICAgICAgICAgICAgID09PSBcIm1kXCJcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICBub3Rlcy5sZW5ndGggPCAyXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbWVudS5hZGRJdGVtKFxuICAgICAgICAgICAgKGl0ZW06IGFueSkgPT4ge1xuICAgICAgICAgICAgICBpdGVtXG4gICAgICAgICAgICAgICAgLnNldFRpdGxlKFxuICAgICAgICAgICAgICAgICAgXCJTZW5kIHRvIERyYWZ0YXZhXCJcbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgLnNldEljb24oXCJzZW5kXCIpXG4gICAgICAgICAgICAgICAgLm9uQ2xpY2soXG4gICAgICAgICAgICAgICAgICBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlkZWFzID1cbiAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBQcm9taXNlLmFsbChcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vdGVzLm1hcChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgKGZpbGUpID0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pZGVhRnJvbUZpbGUoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZW5kUGF5bG9hZChcbiAgICAgICAgICAgICAgICAgICAgICBpZGVhc1xuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgKVxuICAgICk7XG4gIH1cblxuXG4gIHByaXZhdGUgcmVnaXN0ZXJGbG9hdGluZ0NhcHR1cmVBY3Rpb25zKCk6XG4gICAgdm9pZFxuICB7XG4gICAgLypcbiAgICAgVGV4dCBzZWxlY3Rpb24uXG5cbiAgICAgV2UgdXNlIHRoZSBPYnNpZGlhbiBlZGl0b3IgZm9yIHRoZSBhY3R1YWwgdGV4dFxuICAgICB3aGVuZXZlciBwb3NzaWJsZSwgYW5kIERPTSBnZW9tZXRyeSBvbmx5IHRvXG4gICAgIHBvc2l0aW9uIHRoZSB2aXN1YWwgY2Fwc3VsZS5cbiAgICAgKi9cbiAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoXG4gICAgICBkb2N1bWVudCxcbiAgICAgIFwibW91c2V1cFwiLFxuICAgICAgKCkgPT4ge1xuICAgICAgICB3aW5kb3cuc2V0VGltZW91dChcbiAgICAgICAgICAoKSA9PiB0aGlzLnNob3dUZXh0U2VsZWN0aW9uQWN0aW9uKCksXG4gICAgICAgICAgMFxuICAgICAgICApO1xuICAgICAgfVxuICAgICk7XG5cbiAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoXG4gICAgICBkb2N1bWVudCxcbiAgICAgIFwia2V5dXBcIixcbiAgICAgIChldmVudDogS2V5Ym9hcmRFdmVudCkgPT4ge1xuICAgICAgICBpZiAoZXZlbnQua2V5ID09PSBcIkVzY2FwZVwiKSB7XG4gICAgICAgICAgdGhpcy5oaWRlRmxvYXRpbmdBY3Rpb24oKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoXG4gICAgICAgICAgZXZlbnQuc2hpZnRLZXlcbiAgICAgICAgICB8fCBldmVudC5rZXkuc3RhcnRzV2l0aChcIkFycm93XCIpXG4gICAgICAgICkge1xuICAgICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KFxuICAgICAgICAgICAgKCkgPT4gdGhpcy5zaG93VGV4dFNlbGVjdGlvbkFjdGlvbigpLFxuICAgICAgICAgICAgMFxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICApO1xuXG4gICAgLypcbiAgICAgSW1hZ2UgY2xpY2suXG5cbiAgICAgRG8gbm90IHByZXZlbnREZWZhdWx0IG9yIHN0b3BQcm9wYWdhdGlvbi5cbiAgICAgT2JzaWRpYW4gcmVtYWlucyBmdWxseSByZXNwb25zaWJsZSBmb3IgbmF0aXZlXG4gICAgIGltYWdlIHNlbGVjdGlvbiwgcmVzaXplIGhhbmRsZXMgYW5kIGNvbnRyb2xzLlxuICAgICAqL1xuICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChcbiAgICAgIGRvY3VtZW50LFxuICAgICAgXCJjbGlja1wiLFxuICAgICAgKGV2ZW50OiBNb3VzZUV2ZW50KSA9PiB7XG4gICAgICAgIGNvbnN0IHRhcmdldCA9XG4gICAgICAgICAgZXZlbnQudGFyZ2V0IGluc3RhbmNlb2YgRWxlbWVudFxuICAgICAgICAgICAgPyBldmVudC50YXJnZXRcbiAgICAgICAgICAgIDogbnVsbDtcblxuICAgICAgICBpZiAoIXRhcmdldCkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChcbiAgICAgICAgICB0aGlzLmZsb2F0aW5nQWN0aW9uRWxcbiAgICAgICAgICAmJiB0aGlzLmZsb2F0aW5nQWN0aW9uRWwuY29udGFpbnModGFyZ2V0KVxuICAgICAgICApIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBpbWFnZSA9XG4gICAgICAgICAgdGhpcy5maW5kQ2xpY2tlZEltYWdlKHRhcmdldCk7XG5cbiAgICAgICAgaWYgKCFpbWFnZSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChcbiAgICAgICAgICAhaW1hZ2UuY2xvc2VzdChcbiAgICAgICAgICAgIFwiLm1hcmtkb3duLXNvdXJjZS12aWV3LCAubWFya2Rvd24tcHJldmlldy12aWV3XCJcbiAgICAgICAgICApXG4gICAgICAgICkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHggPSBldmVudC5jbGllbnRYO1xuICAgICAgICBjb25zdCB5ID0gZXZlbnQuY2xpZW50WTtcblxuICAgICAgICB3aW5kb3cuc2V0VGltZW91dChcbiAgICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNob3dJbWFnZUNhcHR1cmVBY3Rpb24oXG4gICAgICAgICAgICAgIGltYWdlLFxuICAgICAgICAgICAgICB4LFxuICAgICAgICAgICAgICB5XG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgMFxuICAgICAgICApO1xuICAgICAgfVxuICAgICk7XG5cbiAgICAvKlxuICAgICBBbnkgbmV3IGludGVyYWN0aW9uIG91dHNpZGUgdGhlIGNhcHN1bGUgZGlzbWlzc2VzXG4gICAgIHRoZSBwcmV2aW91cyBhY3Rpb24uXG4gICAgICovXG4gICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KFxuICAgICAgZG9jdW1lbnQsXG4gICAgICBcInBvaW50ZXJkb3duXCIsXG4gICAgICAoZXZlbnQ6IFBvaW50ZXJFdmVudCkgPT4ge1xuICAgICAgICBjb25zdCB0YXJnZXQgPVxuICAgICAgICAgIGV2ZW50LnRhcmdldCBpbnN0YW5jZW9mIE5vZGVcbiAgICAgICAgICAgID8gZXZlbnQudGFyZ2V0XG4gICAgICAgICAgICA6IG51bGw7XG5cbiAgICAgICAgaWYgKFxuICAgICAgICAgIHRhcmdldFxuICAgICAgICAgICYmIHRoaXMuZmxvYXRpbmdBY3Rpb25FbFxuICAgICAgICAgICYmIHRoaXMuZmxvYXRpbmdBY3Rpb25FbC5jb250YWlucyh0YXJnZXQpXG4gICAgICAgICkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuaGlkZUZsb2F0aW5nQWN0aW9uKCk7XG4gICAgICB9LFxuICAgICAgdHJ1ZVxuICAgICk7XG5cbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgIFwic2Nyb2xsXCIsXG4gICAgICB0aGlzLmhpZGVGbG9hdGluZ0FjdGlvbkJvdW5kLFxuICAgICAgdHJ1ZVxuICAgICk7XG5cbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgIFwicmVzaXplXCIsXG4gICAgICB0aGlzLmhpZGVGbG9hdGluZ0FjdGlvbkJvdW5kXG4gICAgKTtcblxuICAgIHRoaXMucmVnaXN0ZXIoXG4gICAgICAoKSA9PiB7XG4gICAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKFxuICAgICAgICAgIFwic2Nyb2xsXCIsXG4gICAgICAgICAgdGhpcy5oaWRlRmxvYXRpbmdBY3Rpb25Cb3VuZCxcbiAgICAgICAgICB0cnVlXG4gICAgICAgICk7XG5cbiAgICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoXG4gICAgICAgICAgXCJyZXNpemVcIixcbiAgICAgICAgICB0aGlzLmhpZGVGbG9hdGluZ0FjdGlvbkJvdW5kXG4gICAgICAgICk7XG5cbiAgICAgICAgdGhpcy5oaWRlRmxvYXRpbmdBY3Rpb24oKTtcbiAgICAgIH1cbiAgICApO1xuICB9XG5cblxuICBwcml2YXRlIGhpZGVGbG9hdGluZ0FjdGlvbkJvdW5kID1cbiAgICAoKTogdm9pZCA9PiB7XG4gICAgICB0aGlzLmhpZGVGbG9hdGluZ0FjdGlvbigpO1xuICAgIH07XG5cblxuICBwcml2YXRlIGZpbmRDbGlja2VkSW1hZ2UoXG4gICAgc3RhcnQ6IEVsZW1lbnRcbiAgKTogSFRNTEltYWdlRWxlbWVudCB8IG51bGxcbiAge1xuICAgIGxldCBlbGVtZW50OiBFbGVtZW50IHwgbnVsbCA9XG4gICAgICBzdGFydDtcblxuICAgIHdoaWxlIChlbGVtZW50KSB7XG4gICAgICBpZiAoXG4gICAgICAgIGVsZW1lbnQgaW5zdGFuY2VvZiBIVE1MSW1hZ2VFbGVtZW50XG4gICAgICApIHtcbiAgICAgICAgcmV0dXJuIGVsZW1lbnQ7XG4gICAgICB9XG5cbiAgICAgIGVsZW1lbnQgPVxuICAgICAgICBlbGVtZW50LnBhcmVudEVsZW1lbnQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuXG4gIHByaXZhdGUgZ2V0U2VsZWN0aW9uQW5jaG9yUmVjdChcbiAgICB2aWV3OiBNYXJrZG93blZpZXcgfCBudWxsXG4gICk6IERPTVJlY3QgfCBudWxsXG4gIHtcbiAgICBjb25zdCBzZWxlY3Rpb24gPVxuICAgICAgd2luZG93LmdldFNlbGVjdGlvbigpO1xuXG4gICAgaWYgKFxuICAgICAgc2VsZWN0aW9uXG4gICAgICAmJiBzZWxlY3Rpb24ucmFuZ2VDb3VudCA+IDBcbiAgICAgICYmICFzZWxlY3Rpb24uaXNDb2xsYXBzZWRcbiAgICApIHtcbiAgICAgIGNvbnN0IHJhbmdlID1cbiAgICAgICAgc2VsZWN0aW9uLmdldFJhbmdlQXQoMCk7XG5cbiAgICAgIGNvbnN0IGNsaWVudFJlY3RzID1cbiAgICAgICAgQXJyYXkuZnJvbShcbiAgICAgICAgICByYW5nZS5nZXRDbGllbnRSZWN0cygpXG4gICAgICAgIClcbiAgICAgICAgLmZpbHRlcihcbiAgICAgICAgICAocmVjdCkgPT5cbiAgICAgICAgICAgIHJlY3Qud2lkdGggPiAwXG4gICAgICAgICAgICAmJiByZWN0LmhlaWdodCA+IDBcbiAgICAgICAgKTtcblxuICAgICAgaWYgKGNsaWVudFJlY3RzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgcmV0dXJuIGNsaWVudFJlY3RzW1xuICAgICAgICAgIGNsaWVudFJlY3RzLmxlbmd0aCAtIDFcbiAgICAgICAgXTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgYm91bmRpbmdSZWN0ID1cbiAgICAgICAgcmFuZ2UuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICAgIGlmIChcbiAgICAgICAgYm91bmRpbmdSZWN0LndpZHRoID4gMFxuICAgICAgICB8fCBib3VuZGluZ1JlY3QuaGVpZ2h0ID4gMFxuICAgICAgKSB7XG4gICAgICAgIHJldHVybiBib3VuZGluZ1JlY3Q7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLypcbiAgICAgTGl2ZSBQcmV2aWV3IGZhbGxiYWNrLlxuXG4gICAgIENvZGVNaXJyb3IgcmVuZGVycyBzZWxlY3RlZCByZWdpb25zIGFzXG4gICAgIGNtLXNlbGVjdGlvbkJhY2tncm91bmQgZWxlbWVudHMuXG4gICAgICovXG4gICAgaWYgKHZpZXcpIHtcbiAgICAgIGNvbnN0IHNlbGVjdGlvblJlY3RzID1cbiAgICAgICAgQXJyYXkuZnJvbShcbiAgICAgICAgICB2aWV3LmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEVsZW1lbnQ+KFxuICAgICAgICAgICAgXCIuY20tc2VsZWN0aW9uQmFja2dyb3VuZFwiXG4gICAgICAgICAgKVxuICAgICAgICApXG4gICAgICAgIC5tYXAoXG4gICAgICAgICAgKGVsZW1lbnQpID0+XG4gICAgICAgICAgICBlbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpXG4gICAgICAgIClcbiAgICAgICAgLmZpbHRlcihcbiAgICAgICAgICAocmVjdCkgPT5cbiAgICAgICAgICAgIHJlY3Qud2lkdGggPiAwXG4gICAgICAgICAgICAmJiByZWN0LmhlaWdodCA+IDBcbiAgICAgICAgKTtcblxuICAgICAgaWYgKHNlbGVjdGlvblJlY3RzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgcmV0dXJuIHNlbGVjdGlvblJlY3RzW1xuICAgICAgICAgIHNlbGVjdGlvblJlY3RzLmxlbmd0aCAtIDFcbiAgICAgICAgXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG5cbiAgcHJpdmF0ZSBzaG93VGV4dFNlbGVjdGlvbkFjdGlvbigpOlxuICAgIHZvaWRcbiAge1xuICAgIGNvbnN0IHZpZXcgPVxuICAgICAgdGhpcy5hcHAud29ya3NwYWNlXG4gICAgICAgIC5nZXRBY3RpdmVWaWV3T2ZUeXBlKFxuICAgICAgICAgIE1hcmtkb3duVmlld1xuICAgICAgICApO1xuXG4gICAgY29uc3QgZWRpdG9yU2VsZWN0aW9uID1cbiAgICAgIHZpZXc/LmVkaXRvci5nZXRTZWxlY3Rpb24oKVxuICAgICAgPz8gXCJcIjtcblxuICAgIGNvbnN0IGRvbVNlbGVjdGlvbiA9XG4gICAgICB3aW5kb3cuZ2V0U2VsZWN0aW9uKClcbiAgICAgICAgPy50b1N0cmluZygpXG4gICAgICA/PyBcIlwiO1xuXG4gICAgY29uc3Qgc2VsZWN0ZWRUZXh0ID1cbiAgICAgIGVkaXRvclNlbGVjdGlvbi50cmltKCkubGVuZ3RoID4gMFxuICAgICAgICA/IGVkaXRvclNlbGVjdGlvblxuICAgICAgICA6IGRvbVNlbGVjdGlvbjtcblxuICAgIGlmIChcbiAgICAgIHNlbGVjdGVkVGV4dC50cmltKCkubGVuZ3RoID09PSAwXG4gICAgKSB7XG4gICAgICB0aGlzLmhpZGVGbG9hdGluZ0FjdGlvbigpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGFuY2hvclJlY3QgPVxuICAgICAgdGhpcy5nZXRTZWxlY3Rpb25BbmNob3JSZWN0KFxuICAgICAgICB2aWV3XG4gICAgICApO1xuXG4gICAgaWYgKCFhbmNob3JSZWN0KSB7XG4gICAgICB0aGlzLmhpZGVGbG9hdGluZ0FjdGlvbigpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGFjdGl2ZUZpbGUgPVxuICAgICAgdmlldz8uZmlsZVxuICAgICAgPz8gdGhpcy5hcHAud29ya3NwYWNlLmdldEFjdGl2ZUZpbGUoKTtcblxuICAgIC8qXG4gICAgIERyYWZ0YXZhLXN0eWxlIHBvc2l0aW9uOlxuICAgICBhbGlnbmVkIHRvIHRoZSBlbmQgb2YgdGhlIHNlbGVjdGVkIHRleHQgYW5kXG4gICAgIHNsaWdodGx5IGFib3ZlIGl0IHdoZW4gcm9vbSBpcyBhdmFpbGFibGUuXG4gICAgICovXG4gICAgY29uc3QgcmVxdWVzdGVkWCA9XG4gICAgICBhbmNob3JSZWN0LnJpZ2h0IC0gNjg7XG5cbiAgICBjb25zdCByZXF1ZXN0ZWRZID1cbiAgICAgIGFuY2hvclJlY3QudG9wID49IDM4XG4gICAgICAgID8gYW5jaG9yUmVjdC50b3AgLSAzNlxuICAgICAgICA6IGFuY2hvclJlY3QuYm90dG9tICsgNjtcblxuICAgIHRoaXMuc2hvd0Zsb2F0aW5nQWN0aW9uKFxuICAgICAgcmVxdWVzdGVkWCxcbiAgICAgIHJlcXVlc3RlZFksXG4gICAgICAoKSA9PiB7XG4gICAgICAgIHRoaXMuc2VuZFBheWxvYWQoW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGtpbmQ6IFwic2VsZWN0aW9uXCIsXG4gICAgICAgICAgICBjb250ZW50OiBzZWxlY3RlZFRleHQsXG4gICAgICAgICAgICBzb3VyY2VUaXRsZTpcbiAgICAgICAgICAgICAgYWN0aXZlRmlsZT8uYmFzZW5hbWUsXG4gICAgICAgICAgICBzb3VyY2VQYXRoOlxuICAgICAgICAgICAgICBhY3RpdmVGaWxlPy5wYXRoXG4gICAgICAgICAgfVxuICAgICAgICBdKTtcbiAgICAgIH1cbiAgICApO1xuICB9XG5cblxuICBwcml2YXRlIHNob3dJbWFnZUNhcHR1cmVBY3Rpb24oXG4gICAgaW1hZ2U6IEhUTUxJbWFnZUVsZW1lbnQsXG4gICAgY2xpY2tYOiBudW1iZXIsXG4gICAgY2xpY2tZOiBudW1iZXJcbiAgKTogdm9pZFxuICB7XG4gICAgLypcbiAgICAgUG9zaXRpb24gdGhlIGNhcHN1bGUgbmV4dCB0byB0aGUgY2xpY2sgcmF0aGVyXG4gICAgIHRoYW4gaW4gYSBmaXhlZCBpbWFnZSBjb3JuZXIuIFRoaXMgYXZvaWRzXG4gICAgIE9ic2lkaWFuJ3Mgb3duIHpvb20vc291cmNlIGNvbnRyb2xzIGFuZCByZXNpemVcbiAgICAgaGFuZGxlLlxuICAgICAqL1xuICAgIGNvbnN0IHJlcXVlc3RlZFggPVxuICAgICAgY2xpY2tYIC0gMzQ7XG5cbiAgICBjb25zdCByZXF1ZXN0ZWRZID1cbiAgICAgIGNsaWNrWSA+PSA0MFxuICAgICAgICA/IGNsaWNrWSAtIDM4XG4gICAgICAgIDogY2xpY2tZICsgMTA7XG5cbiAgICB0aGlzLnNob3dGbG9hdGluZ0FjdGlvbihcbiAgICAgIHJlcXVlc3RlZFgsXG4gICAgICByZXF1ZXN0ZWRZLFxuICAgICAgKCkgPT4ge1xuICAgICAgICB2b2lkIHRoaXMuc2VuZENsaWNrZWRJbWFnZShcbiAgICAgICAgICBpbWFnZVxuICAgICAgICApO1xuICAgICAgfVxuICAgICk7XG4gIH1cblxuXG4gIHByaXZhdGUgYXN5bmMgc2VuZENsaWNrZWRJbWFnZShcbiAgICBpbWFnZTogSFRNTEltYWdlRWxlbWVudFxuICApOiBQcm9taXNlPHZvaWQ+XG4gIHtcbiAgICBjb25zdCBzb3VyY2VDYW5kaWRhdGVzID1cbiAgICAgIFtcbiAgICAgICAgaW1hZ2UuY3VycmVudFNyYyxcbiAgICAgICAgaW1hZ2UuZ2V0QXR0cmlidXRlKFwic3JjXCIpLFxuICAgICAgICBpbWFnZS5nZXRBdHRyaWJ1dGUoXCJkYXRhLXNyY1wiKVxuICAgICAgXVxuICAgICAgLmZpbHRlcihcbiAgICAgICAgKHZhbHVlKTogdmFsdWUgaXMgc3RyaW5nID0+XG4gICAgICAgICAgQm9vbGVhbih2YWx1ZSlcbiAgICAgICk7XG5cbiAgICBjb25zdCByZW1vdGVTb3VyY2UgPVxuICAgICAgc291cmNlQ2FuZGlkYXRlcy5maW5kKFxuICAgICAgICAodmFsdWUpID0+XG4gICAgICAgICAgdmFsdWUuc3RhcnRzV2l0aChcImh0dHBzOi8vXCIpXG4gICAgICAgICAgfHwgdmFsdWUuc3RhcnRzV2l0aChcImh0dHA6Ly9cIilcbiAgICAgICk7XG5cbiAgICBsZXQgaWRlYTpcbiAgICAgIENhcHR1cmVJZGVhIHwgbnVsbCA9XG4gICAgICAgIG51bGw7XG5cbiAgICBpZiAocmVtb3RlU291cmNlKSB7XG4gICAgICBpZGVhID1cbiAgICAgICAgYXdhaXQgdGhpcy5pZGVhRnJvbVJlbW90ZUltYWdlKFxuICAgICAgICAgIHJlbW90ZVNvdXJjZVxuICAgICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBmaWxlID1cbiAgICAgICAgdGhpcy5yZXNvbHZlSW1hZ2VGaWxlRnJvbUVsZW1lbnQoXG4gICAgICAgICAgaW1hZ2UsXG4gICAgICAgICAgc291cmNlQ2FuZGlkYXRlc1xuICAgICAgICApO1xuXG4gICAgICBpZiAoIWZpbGUpIHtcbiAgICAgICAgbmV3IE5vdGljZShcbiAgICAgICAgICBcIkNvdWxkIG5vdCBsb2NhdGUgaW1hZ2UgaW4gdmF1bHRcIlxuICAgICAgICApO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlkZWEgPVxuICAgICAgICBhd2FpdCB0aGlzLmlkZWFGcm9tSW1hZ2VGaWxlKFxuICAgICAgICAgIGZpbGVcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBpZiAoaWRlYSkge1xuICAgICAgdGhpcy5zZW5kUGF5bG9hZChbXG4gICAgICAgIGlkZWFcbiAgICAgIF0pO1xuICAgIH1cbiAgfVxuXG5cbiAgcHJpdmF0ZSByZXNvbHZlSW1hZ2VGaWxlRnJvbUVsZW1lbnQoXG4gICAgaW1hZ2U6IEhUTUxJbWFnZUVsZW1lbnQsXG4gICAgc291cmNlQ2FuZGlkYXRlczogc3RyaW5nW11cbiAgKTogVEZpbGUgfCBudWxsXG4gIHtcbiAgICBjb25zdCBjYW5kaWRhdGVzOlxuICAgICAgc3RyaW5nW10gPSBbXTtcblxuICAgIGNvbnN0IGFkZENhbmRpZGF0ZSA9XG4gICAgICAoXG4gICAgICAgIHJhdzpcbiAgICAgICAgICBzdHJpbmcgfCBudWxsIHwgdW5kZWZpbmVkXG4gICAgICApID0+IHtcbiAgICAgICAgaWYgKCFyYXcpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgdmFsdWUgPSByYXc7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICB2YWx1ZSA9XG4gICAgICAgICAgICBkZWNvZGVVUklDb21wb25lbnQoXG4gICAgICAgICAgICAgIHZhbHVlXG4gICAgICAgICAgICApO1xuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAvLyBLZWVwIG9yaWdpbmFsIHZhbHVlLlxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcXVlcnlJbmRleCA9XG4gICAgICAgICAgdmFsdWUuaW5kZXhPZihcIj9cIik7XG5cbiAgICAgICAgaWYgKHF1ZXJ5SW5kZXggPj0gMCkge1xuICAgICAgICAgIHZhbHVlID1cbiAgICAgICAgICAgIHZhbHVlLnN1YnN0cmluZyhcbiAgICAgICAgICAgICAgMCxcbiAgICAgICAgICAgICAgcXVlcnlJbmRleFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGhhc2hJbmRleCA9XG4gICAgICAgICAgdmFsdWUuaW5kZXhPZihcIiNcIik7XG5cbiAgICAgICAgaWYgKGhhc2hJbmRleCA+PSAwKSB7XG4gICAgICAgICAgdmFsdWUgPVxuICAgICAgICAgICAgdmFsdWUuc3Vic3RyaW5nKFxuICAgICAgICAgICAgICAwLFxuICAgICAgICAgICAgICBoYXNoSW5kZXhcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICBjYW5kaWRhdGVzLnB1c2godmFsdWUpO1xuICAgICAgfTtcblxuICAgIGZvciAoXG4gICAgICBjb25zdCBzb3VyY2VcbiAgICAgIG9mIHNvdXJjZUNhbmRpZGF0ZXNcbiAgICApIHtcbiAgICAgIGFkZENhbmRpZGF0ZShzb3VyY2UpO1xuICAgIH1cblxuICAgIGFkZENhbmRpZGF0ZShcbiAgICAgIGltYWdlLmdldEF0dHJpYnV0ZShcImRhdGEtcGF0aFwiKVxuICAgICk7XG5cbiAgICBhZGRDYW5kaWRhdGUoXG4gICAgICBpbWFnZS5nZXRBdHRyaWJ1dGUoXCJhbHRcIilcbiAgICApO1xuXG4gICAgY29uc3QgaW1hZ2VGaWxlcyA9XG4gICAgICB0aGlzLmFwcC52YXVsdFxuICAgICAgICAuZ2V0RmlsZXMoKVxuICAgICAgICAuZmlsdGVyKFxuICAgICAgICAgIChmaWxlKSA9PlxuICAgICAgICAgICAgdGhpcy5pc1N1cHBvcnRlZEltYWdlRmlsZShcbiAgICAgICAgICAgICAgZmlsZVxuICAgICAgICAgICAgKVxuICAgICAgICApO1xuXG4gICAgLypcbiAgICAgUHJlZmVyIGV4YWN0L2Z1bGwtcGF0aCByZXNvbHV0aW9uLlxuICAgICAqL1xuICAgIGZvciAoXG4gICAgICBjb25zdCBjYW5kaWRhdGVcbiAgICAgIG9mIGNhbmRpZGF0ZXNcbiAgICApIHtcbiAgICAgIGZvciAoXG4gICAgICAgIGNvbnN0IGZpbGVcbiAgICAgICAgb2YgaW1hZ2VGaWxlc1xuICAgICAgKSB7XG4gICAgICAgIGlmIChcbiAgICAgICAgICBjYW5kaWRhdGUgPT09IGZpbGUucGF0aFxuICAgICAgICAgIHx8IGNhbmRpZGF0ZS5lbmRzV2l0aChcbiAgICAgICAgICAgIFwiL1wiICsgZmlsZS5wYXRoXG4gICAgICAgICAgKVxuICAgICAgICAgIHx8IGNhbmRpZGF0ZS5lbmRzV2l0aChcbiAgICAgICAgICAgIGZpbGUucGF0aFxuICAgICAgICAgIClcbiAgICAgICAgKSB7XG4gICAgICAgICAgcmV0dXJuIGZpbGU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKlxuICAgICBGaWxlbmFtZSBmYWxsYmFjayBvbmx5IHdoZW4gdGhlcmUgaXMgZXhhY3RseVxuICAgICBvbmUgbWF0Y2hpbmcgaW1hZ2UgaW4gdGhlIHZhdWx0LlxuICAgICAqL1xuICAgIGZvciAoXG4gICAgICBjb25zdCBjYW5kaWRhdGVcbiAgICAgIG9mIGNhbmRpZGF0ZXNcbiAgICApIHtcbiAgICAgIGNvbnN0IGZpbGVuYW1lID1cbiAgICAgICAgY2FuZGlkYXRlXG4gICAgICAgICAgLnNwbGl0KFwiL1wiKVxuICAgICAgICAgIC5maWx0ZXIoQm9vbGVhbilcbiAgICAgICAgICAucG9wKCk7XG5cbiAgICAgIGlmICghZmlsZW5hbWUpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IG1hdGNoZXMgPVxuICAgICAgICBpbWFnZUZpbGVzLmZpbHRlcihcbiAgICAgICAgICAoZmlsZSkgPT5cbiAgICAgICAgICAgIGZpbGUubmFtZSA9PT0gZmlsZW5hbWVcbiAgICAgICAgKTtcblxuICAgICAgaWYgKG1hdGNoZXMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIHJldHVybiBtYXRjaGVzWzBdO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9XG5cblxuICBwcml2YXRlIHNob3dGbG9hdGluZ0FjdGlvbihcbiAgICByZXF1ZXN0ZWRYOiBudW1iZXIsXG4gICAgcmVxdWVzdGVkWTogbnVtYmVyLFxuICAgIGFjdGlvbjogKCkgPT4gdm9pZFxuICApOiB2b2lkXG4gIHtcbiAgICB0aGlzLmhpZGVGbG9hdGluZ0FjdGlvbigpO1xuXG4gICAgY29uc3QgYnV0dG9uID1cbiAgICAgIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXG4gICAgICAgIFwiYnV0dG9uXCJcbiAgICAgICk7XG5cbiAgICBidXR0b24udHlwZSA9XG4gICAgICBcImJ1dHRvblwiO1xuXG4gICAgYnV0dG9uLmNsYXNzTmFtZSA9XG4gICAgICBcImluenJ0LWNhcHR1cmUtYnViYmxlXCI7XG5cbiAgICBidXR0b24uc2V0QXR0cmlidXRlKFxuICAgICAgXCJhcmlhLWxhYmVsXCIsXG4gICAgICBcIlNlbmQgdG8gRHJhZnRhdmFcIlxuICAgICk7XG5cbiAgICBjb25zdCBpY29uID1cbiAgICAgIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXG4gICAgICAgIFwic3BhblwiXG4gICAgICApO1xuXG4gICAgaWNvbi5jbGFzc05hbWUgPVxuICAgICAgXCJpbnpydC1jYXB0dXJlLWJ1YmJsZS1pY29uXCI7XG5cbiAgICBzZXRJY29uKFxuICAgICAgaWNvbixcbiAgICAgIFwic2VuZFwiXG4gICAgKTtcblxuICAgIGNvbnN0IGxhYmVsID1cbiAgICAgIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXG4gICAgICAgIFwic3BhblwiXG4gICAgICApO1xuXG4gICAgbGFiZWwuY2xhc3NOYW1lID1cbiAgICAgIFwiaW56cnQtY2FwdHVyZS1idWJibGUtbGFiZWxcIjtcblxuICAgIGxhYmVsLnRleHRDb250ZW50ID1cbiAgICAgIFwiRHJhZnRhdmFcIjtcblxuICAgIGJ1dHRvbi5hcHBlbmRDaGlsZChcbiAgICAgIGljb25cbiAgICApO1xuXG4gICAgYnV0dG9uLmFwcGVuZENoaWxkKFxuICAgICAgbGFiZWxcbiAgICApO1xuXG4gICAgYnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXG4gICAgICBcInBvaW50ZXJkb3duXCIsXG4gICAgICAoZXZlbnQpID0+IHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICB9XG4gICAgKTtcblxuICAgIGJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFxuICAgICAgXCJjbGlja1wiLFxuICAgICAgKGV2ZW50KSA9PiB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuXG4gICAgICAgIHRoaXMuaGlkZUZsb2F0aW5nQWN0aW9uKCk7XG5cbiAgICAgICAgYWN0aW9uKCk7XG4gICAgICB9XG4gICAgKTtcblxuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoXG4gICAgICBidXR0b25cbiAgICApO1xuXG4gICAgdGhpcy5mbG9hdGluZ0FjdGlvbkVsID1cbiAgICAgIGJ1dHRvbjtcblxuICAgIGNvbnN0IHJlY3QgPVxuICAgICAgYnV0dG9uLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXG4gICAgY29uc3QgbWFyZ2luID1cbiAgICAgIDg7XG5cbiAgICBjb25zdCB4ID1cbiAgICAgIE1hdGgubWF4KFxuICAgICAgICBtYXJnaW4sXG4gICAgICAgIE1hdGgubWluKFxuICAgICAgICAgIHJlcXVlc3RlZFgsXG4gICAgICAgICAgd2luZG93LmlubmVyV2lkdGhcbiAgICAgICAgICAgIC0gcmVjdC53aWR0aFxuICAgICAgICAgICAgLSBtYXJnaW5cbiAgICAgICAgKVxuICAgICAgKTtcblxuICAgIGNvbnN0IHkgPVxuICAgICAgTWF0aC5tYXgoXG4gICAgICAgIG1hcmdpbixcbiAgICAgICAgTWF0aC5taW4oXG4gICAgICAgICAgcmVxdWVzdGVkWSxcbiAgICAgICAgICB3aW5kb3cuaW5uZXJIZWlnaHRcbiAgICAgICAgICAgIC0gcmVjdC5oZWlnaHRcbiAgICAgICAgICAgIC0gbWFyZ2luXG4gICAgICAgIClcbiAgICAgICk7XG5cbiAgICBidXR0b24uc3R5bGUubGVmdCA9XG4gICAgICBgJHt4fXB4YDtcblxuICAgIGJ1dHRvbi5zdHlsZS50b3AgPVxuICAgICAgYCR7eX1weGA7XG4gIH1cblxuXG4gIHByaXZhdGUgaGlkZUZsb2F0aW5nQWN0aW9uKCk6XG4gICAgdm9pZFxuICB7XG4gICAgdGhpcy5mbG9hdGluZ0FjdGlvbkVsXG4gICAgICA/LnJlbW92ZSgpO1xuXG4gICAgdGhpcy5mbG9hdGluZ0FjdGlvbkVsID1cbiAgICAgIG51bGw7XG4gIH1cblxuXG4gIHByaXZhdGUgaXNTdXBwb3J0ZWRJbWFnZUZpbGUoXG4gICAgZmlsZTogVEZpbGVcbiAgKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIFtcbiAgICAgIFwicG5nXCIsXG4gICAgICBcImpwZ1wiLFxuICAgICAgXCJqcGVnXCIsXG4gICAgICBcIndlYnBcIixcbiAgICAgIFwiZ2lmXCIsXG4gICAgICBcImhlaWNcIixcbiAgICAgIFwiaGVpZlwiLFxuICAgICAgXCJ0aWZcIixcbiAgICAgIFwidGlmZlwiXG4gICAgXS5pbmNsdWRlcyhcbiAgICAgIGZpbGUuZXh0ZW5zaW9uXG4gICAgICAgIC50b0xvd2VyQ2FzZSgpXG4gICAgKTtcbiAgfVxuXG5cbiAgcHJpdmF0ZSBtaW1lVHlwZUZvckV4dGVuc2lvbihcbiAgICBleHRlbnNpb246IHN0cmluZ1xuICApOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgIHN3aXRjaCAoXG4gICAgICBleHRlbnNpb24udG9Mb3dlckNhc2UoKVxuICAgICkge1xuICAgICAgY2FzZSBcInBuZ1wiOlxuICAgICAgICByZXR1cm4gXCJpbWFnZS9wbmdcIjtcblxuICAgICAgY2FzZSBcImpwZ1wiOlxuICAgICAgY2FzZSBcImpwZWdcIjpcbiAgICAgICAgcmV0dXJuIFwiaW1hZ2UvanBlZ1wiO1xuXG4gICAgICBjYXNlIFwid2VicFwiOlxuICAgICAgICByZXR1cm4gXCJpbWFnZS93ZWJwXCI7XG5cbiAgICAgIGNhc2UgXCJnaWZcIjpcbiAgICAgICAgcmV0dXJuIFwiaW1hZ2UvZ2lmXCI7XG5cbiAgICAgIGNhc2UgXCJoZWljXCI6XG4gICAgICAgIHJldHVybiBcImltYWdlL2hlaWNcIjtcblxuICAgICAgY2FzZSBcImhlaWZcIjpcbiAgICAgICAgcmV0dXJuIFwiaW1hZ2UvaGVpZlwiO1xuXG4gICAgICBjYXNlIFwidGlmXCI6XG4gICAgICBjYXNlIFwidGlmZlwiOlxuICAgICAgICByZXR1cm4gXCJpbWFnZS90aWZmXCI7XG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cblxuICBwcml2YXRlIGFzeW5jIGlkZWFGcm9tSW1hZ2VGaWxlKFxuICAgIGZpbGU6IFRGaWxlXG4gICk6IFByb21pc2U8Q2FwdHVyZUlkZWEgfCBudWxsPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGRhdGEgPVxuICAgICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdFxuICAgICAgICAgIC5yZWFkQmluYXJ5KFxuICAgICAgICAgICAgZmlsZVxuICAgICAgICAgICk7XG5cbiAgICAgIGlmIChcbiAgICAgICAgZGF0YS5ieXRlTGVuZ3RoID09PSAwXG4gICAgICApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIFwiSW1hZ2UgZmlsZSBpcyBlbXB0eVwiXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGtpbmQ6XG4gICAgICAgICAgXCJpbWFnZVwiLFxuXG4gICAgICAgIGltYWdlOiB7XG4gICAgICAgICAgZGF0YUJhc2U2NDpcbiAgICAgICAgICAgIEJ1ZmZlclxuICAgICAgICAgICAgICAuZnJvbShkYXRhKVxuICAgICAgICAgICAgICAudG9TdHJpbmcoXG4gICAgICAgICAgICAgICAgXCJiYXNlNjRcIlxuICAgICAgICAgICAgICApLFxuXG4gICAgICAgICAgbWltZVR5cGU6XG4gICAgICAgICAgICB0aGlzLm1pbWVUeXBlRm9yRXh0ZW5zaW9uKFxuICAgICAgICAgICAgICBmaWxlLmV4dGVuc2lvblxuICAgICAgICAgICAgKSxcblxuICAgICAgICAgIG9yaWdpbmFsRmlsZU5hbWU6XG4gICAgICAgICAgICBmaWxlLm5hbWVcbiAgICAgICAgfSxcblxuICAgICAgICBzb3VyY2VUaXRsZTpcbiAgICAgICAgICBmaWxlLmJhc2VuYW1lLFxuXG4gICAgICAgIHNvdXJjZVBhdGg6XG4gICAgICAgICAgZmlsZS5wYXRoXG4gICAgICB9O1xuICAgIH0gY2F0Y2ggKFxuICAgICAgZXJyb3JcbiAgICApIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAgIFwiW0RyYWZ0YXZhIENvbXBhbmlvbl0gbG9jYWwgaW1hZ2UgcmVhZCBmYWlsZWQ6XCIsXG4gICAgICAgIGVycm9yXG4gICAgICApO1xuXG4gICAgICBuZXcgTm90aWNlKFxuICAgICAgICBcIkNvdWxkIG5vdCByZWFkIGltYWdlXCJcbiAgICAgICk7XG5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG5cbiAgcHJpdmF0ZSBhc3luYyBpZGVhRnJvbVJlbW90ZUltYWdlKFxuICAgIHJhd1VybDogc3RyaW5nXG4gICk6IFByb21pc2U8Q2FwdHVyZUlkZWEgfCBudWxsPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID1cbiAgICAgICAgYXdhaXQgcmVxdWVzdFVybCh7XG4gICAgICAgICAgdXJsOlxuICAgICAgICAgICAgcmF3VXJsLFxuXG4gICAgICAgICAgbWV0aG9kOlxuICAgICAgICAgICAgXCJHRVRcIixcblxuICAgICAgICAgIHRocm93OlxuICAgICAgICAgICAgZmFsc2VcbiAgICAgICAgfSk7XG5cbiAgICAgIGlmIChcbiAgICAgICAgcmVzcG9uc2Uuc3RhdHVzIDwgMjAwXG4gICAgICAgIHx8XG4gICAgICAgIHJlc3BvbnNlLnN0YXR1cyA+PSAzMDBcbiAgICAgICkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYEhUVFAgJHtyZXNwb25zZS5zdGF0dXN9YFxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICBpZiAoXG4gICAgICAgIHJlc3BvbnNlLmFycmF5QnVmZmVyLmJ5dGVMZW5ndGhcbiAgICAgICAgICA9PT0gMFxuICAgICAgKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBcIkRvd25sb2FkZWQgaW1hZ2UgaXMgZW1wdHlcIlxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBjb250ZW50VHlwZUVudHJ5ID1cbiAgICAgICAgT2JqZWN0LmVudHJpZXMoXG4gICAgICAgICAgcmVzcG9uc2UuaGVhZGVyc1xuICAgICAgICApXG4gICAgICAgIC5maW5kKFxuICAgICAgICAgIChba2V5XSkgPT5cbiAgICAgICAgICAgIGtleS50b0xvd2VyQ2FzZSgpXG4gICAgICAgICAgICAgID09PSBcImNvbnRlbnQtdHlwZVwiXG4gICAgICAgICk7XG5cbiAgICAgIGNvbnN0IHJlc3BvbnNlTWltZVR5cGUgPVxuICAgICAgICBjb250ZW50VHlwZUVudHJ5XG4gICAgICAgICAgPyBTdHJpbmcoXG4gICAgICAgICAgICAgIGNvbnRlbnRUeXBlRW50cnlbMV1cbiAgICAgICAgICAgIClcbiAgICAgICAgICAgIC5zcGxpdChcIjtcIilbMF1cbiAgICAgICAgICAgIC50cmltKClcbiAgICAgICAgICA6IHVuZGVmaW5lZDtcblxuICAgICAgY29uc3QgcGFyc2VkID1cbiAgICAgICAgbmV3IFVSTChcbiAgICAgICAgICByYXdVcmxcbiAgICAgICAgKTtcblxuICAgICAgY29uc3QgcmF3RmlsZU5hbWUgPVxuICAgICAgICBwYXJzZWQucGF0aG5hbWVcbiAgICAgICAgICAuc3BsaXQoXCIvXCIpXG4gICAgICAgICAgLmZpbHRlcihCb29sZWFuKVxuICAgICAgICAgIC5wb3AoKTtcblxuICAgICAgY29uc3Qgb3JpZ2luYWxGaWxlTmFtZSA9XG4gICAgICAgIHJhd0ZpbGVOYW1lXG4gICAgICAgICAgPyBkZWNvZGVVUklDb21wb25lbnQoXG4gICAgICAgICAgICAgIHJhd0ZpbGVOYW1lXG4gICAgICAgICAgICApXG4gICAgICAgICAgOiB1bmRlZmluZWQ7XG5cbiAgICAgIGNvbnN0IGV4dGVuc2lvbiA9XG4gICAgICAgIG9yaWdpbmFsRmlsZU5hbWVcbiAgICAgICAgICA/LnNwbGl0KFwiLlwiKVxuICAgICAgICAgIC5wb3AoKVxuICAgICAgICAgID8udG9Mb3dlckNhc2UoKTtcblxuICAgICAgY29uc3QgbWltZVR5cGUgPVxuICAgICAgICByZXNwb25zZU1pbWVUeXBlXG4gICAgICAgICAgPy50b0xvd2VyQ2FzZSgpXG4gICAgICAgICAgLnN0YXJ0c1dpdGgoXG4gICAgICAgICAgICBcImltYWdlL1wiXG4gICAgICAgICAgKVxuICAgICAgICAgID8gcmVzcG9uc2VNaW1lVHlwZVxuICAgICAgICAgIDogZXh0ZW5zaW9uXG4gICAgICAgICAgICA/IHRoaXNcbiAgICAgICAgICAgICAgICAubWltZVR5cGVGb3JFeHRlbnNpb24oXG4gICAgICAgICAgICAgICAgICBleHRlbnNpb25cbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICA6IHVuZGVmaW5lZDtcblxuICAgICAgaWYgKFxuICAgICAgICAhbWltZVR5cGVcbiAgICAgICkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgXCJEb3dubG9hZGVkIHJlc291cmNlIGlzIG5vdCBhIHN1cHBvcnRlZCBpbWFnZVwiXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGtpbmQ6XG4gICAgICAgICAgXCJpbWFnZVwiLFxuXG4gICAgICAgIGltYWdlOiB7XG4gICAgICAgICAgZGF0YUJhc2U2NDpcbiAgICAgICAgICAgIEJ1ZmZlclxuICAgICAgICAgICAgICAuZnJvbShcbiAgICAgICAgICAgICAgICByZXNwb25zZS5hcnJheUJ1ZmZlclxuICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgIC50b1N0cmluZyhcbiAgICAgICAgICAgICAgICBcImJhc2U2NFwiXG4gICAgICAgICAgICAgICksXG5cbiAgICAgICAgICBtaW1lVHlwZSxcblxuICAgICAgICAgIG9yaWdpbmFsRmlsZU5hbWVcbiAgICAgICAgfSxcblxuICAgICAgICBzb3VyY2VUaXRsZTpcbiAgICAgICAgICBvcmlnaW5hbEZpbGVOYW1lLFxuXG4gICAgICAgIHNvdXJjZVBhdGg6XG4gICAgICAgICAgcmF3VXJsXG4gICAgICB9O1xuICAgIH0gY2F0Y2ggKFxuICAgICAgZXJyb3JcbiAgICApIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAgIFwiW0RyYWZ0YXZhIENvbXBhbmlvbl0gcmVtb3RlIGltYWdlIGRvd25sb2FkIGZhaWxlZDpcIixcbiAgICAgICAgZXJyb3JcbiAgICAgICk7XG5cbiAgICAgIG5ldyBOb3RpY2UoXG4gICAgICAgIFwiQ291bGQgbm90IGRvd25sb2FkIGltYWdlXCJcbiAgICAgICk7XG5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG5cbiAgcHJpdmF0ZSBhc3luYyBpZGVhRnJvbUZpbGUoXG4gICAgZmlsZTogVEZpbGVcbiAgKTogUHJvbWlzZTxDYXB0dXJlSWRlYT4ge1xuICAgIGNvbnN0IG1hcmtkb3duID1cbiAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0XG4gICAgICAgIC5jYWNoZWRSZWFkKGZpbGUpO1xuXG4gICAgLypcbiAgICAgRW1wdHkvdGl0bGUtb25seSBub3RlOlxuICAgICBmaWxlbmFtZSBiZWNvbWVzIHRoZSBJZGVhLlxuXG4gICAgIE90aGVyd2lzZSBwcmVzZXJ2ZSB0aGUgbm90ZSBib2R5IGV4YWN0bHkuXG4gICAgKi9cbiAgICBjb25zdCBjb250ZW50ID1cbiAgICAgIG1hcmtkb3duLnRyaW0oKS5sZW5ndGggPiAwXG4gICAgICAgID8gbWFya2Rvd25cbiAgICAgICAgOiBmaWxlLmJhc2VuYW1lO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGtpbmQ6XG4gICAgICAgIFwibm90ZVwiLFxuXG4gICAgICBjb250ZW50LFxuXG4gICAgICBzb3VyY2VUaXRsZTpcbiAgICAgICAgZmlsZS5iYXNlbmFtZSxcblxuICAgICAgc291cmNlUGF0aDpcbiAgICAgICAgZmlsZS5wYXRoXG4gICAgfTtcbiAgfVxuXG5cbiAgcHJpdmF0ZSBzZW5kUGF5bG9hZChcbiAgICBpZGVhczogQ2FwdHVyZUlkZWFbXVxuICApOiB2b2lkIHtcbiAgICBpZiAoXG4gICAgICBpZGVhcy5sZW5ndGggPT09IDBcbiAgICApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoXG4gICAgICAhZXhpc3RzU3luYyhcbiAgICAgICAgREVCVUdfRFJBRlRBVkFfQVBQXG4gICAgICApXG4gICAgKSB7XG4gICAgICBuZXcgTm90aWNlKFxuICAgICAgICBcIkRyYWZ0YXZhIGFwcCBpcyBub3QgYXZhaWxhYmxlXCJcbiAgICAgICk7XG5cbiAgICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAgIFwiW0RyYWZ0YXZhIENvbXBhbmlvbl0gTWlzc2luZyBhcHA6XCIsXG4gICAgICAgIERFQlVHX0RSQUZUQVZBX0FQUFxuICAgICAgKTtcblxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBkaXJlY3RvcnkgPVxuICAgICAgICBqb2luKFxuICAgICAgICAgIHRtcGRpcigpLFxuICAgICAgICAgIFwiaW56cnQtY29tcGFuaW9uXCJcbiAgICAgICAgKTtcblxuICAgICAgbWtkaXJTeW5jKFxuICAgICAgICBkaXJlY3RvcnksXG4gICAgICAgIHtcbiAgICAgICAgICByZWN1cnNpdmU6XG4gICAgICAgICAgICB0cnVlXG4gICAgICAgIH1cbiAgICAgICk7XG5cbiAgICAgIGNvbnN0IGNhcHR1cmVQYXRoID1cbiAgICAgICAgam9pbihcbiAgICAgICAgICBkaXJlY3RvcnksXG4gICAgICAgICAgYCR7cmFuZG9tVVVJRCgpfS5pbnpydGNhcHR1cmVgXG4gICAgICAgICk7XG5cbiAgICAgIGNvbnN0IGVudmVsb3BlOlxuICAgICAgICBDYXB0dXJlRW52ZWxvcGUgPVxuICAgICAge1xuICAgICAgICB2ZXJzaW9uOlxuICAgICAgICAgIDEsXG5cbiAgICAgICAgaWRlYXNcbiAgICAgIH07XG5cbiAgICAgIHdyaXRlRmlsZVN5bmMoXG4gICAgICAgIGNhcHR1cmVQYXRoLFxuICAgICAgICBKU09OLnN0cmluZ2lmeShcbiAgICAgICAgICBlbnZlbG9wZSxcbiAgICAgICAgICBudWxsLFxuICAgICAgICAgIDJcbiAgICAgICAgKSxcbiAgICAgICAgXCJ1dGY4XCJcbiAgICAgICk7XG5cbiAgICAgIC8qXG4gICAgICAgVGhlIGZpbGUgaXMgdGhlIHBheWxvYWQuXG5cbiAgICAgICBgb3BlbiAtYWAgbGF1bmNoZXMgRHJhZnRhdmEgd2hlbiBjbG9zZWQgb3JcbiAgICAgICBhY3RpdmF0ZXMgdGhlIGFscmVhZHktcnVubmluZyBpbnN0YWxsZWQgYXBwXG4gICAgICAgYW5kIGRlbGl2ZXJzIHRoZSBjYXB0dXJlIGZpbGUgdG8gaXQuXG4gICAgICAqL1xuICAgICAgZXhlY0ZpbGUoXG4gICAgICAgIFwiL3Vzci9iaW4vb3BlblwiLFxuICAgICAgICBbXG4gICAgICAgICAgXCItYVwiLFxuICAgICAgICAgIERFQlVHX0RSQUZUQVZBX0FQUCxcbiAgICAgICAgICBjYXB0dXJlUGF0aFxuICAgICAgICBdLFxuICAgICAgICAoXG4gICAgICAgICAgZXJyb3JcbiAgICAgICAgKSA9PiB7XG4gICAgICAgICAgaWYgKFxuICAgICAgICAgICAgZXJyb3JcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAgICAgICAgIFwiW0RyYWZ0YXZhIENvbXBhbmlvbl0gb3BlbiBmYWlsZWQ6XCIsXG4gICAgICAgICAgICAgIGVycm9yXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICBuZXcgTm90aWNlKFxuICAgICAgICAgICAgICBcIkNvdWxkIG5vdCBvcGVuIERyYWZ0YXZhXCJcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBuZXcgTm90aWNlKFxuICAgICAgICAgICAgaWRlYXMubGVuZ3RoID09PSAxXG4gICAgICAgICAgICAgID8gXCJTZW50IHRvIERyYWZ0YXZhXCJcbiAgICAgICAgICAgICAgOiBgU2VudCAke2lkZWFzLmxlbmd0aH0gSWRlYXMgdG8gRHJhZnRhdmFgXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgKTtcbiAgICB9IGNhdGNoIChcbiAgICAgIGVycm9yXG4gICAgKSB7XG4gICAgICBjb25zb2xlLmVycm9yKFxuICAgICAgICBcIltEcmFmdGF2YSBDb21wYW5pb25dIHNlbmQgZmFpbGVkOlwiLFxuICAgICAgICBlcnJvclxuICAgICAgKTtcblxuICAgICAgbmV3IE5vdGljZShcbiAgICAgICAgXCJDb3VsZCBub3Qgc2VuZCB0byBEcmFmdGF2YVwiXG4gICAgICApO1xuICAgIH1cbiAgfVxufVxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtB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
