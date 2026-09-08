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
  default: () => INZRTCompanionPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var import_node_buffer = require("node:buffer");
var import_node_child_process = require("node:child_process");
var import_node_crypto = require("node:crypto");
var import_node_fs = require("node:fs");
var import_node_os = require("node:os");
var import_node_path = require("node:path");
var DEBUG_INZRT_APP = "/tmp/INZRT-ObsidianCapture-1.1.58/Build/Products/Debug/INZRT.app";
var INZRTCompanionPlugin = class extends import_obsidian.Plugin {
  floatingActionEl = null;
  async onload() {
    this.registerSingleFileMenu();
    this.registerMultiFileMenu();
    this.registerFloatingCaptureActions();
    new import_obsidian.Notice(
      "INZRT Companion loaded"
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
                "Send to INZRT"
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
                "Send to INZRT"
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
      "Send to INZRT"
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
    label.textContent = "INZRT";
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
        "[INZRT Companion] local image read failed:",
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
        "[INZRT Companion] remote image download failed:",
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
      DEBUG_INZRT_APP
    )) {
      new import_obsidian.Notice(
        "INZRT test build is not available"
      );
      console.error(
        "[INZRT Companion] Missing app:",
        DEBUG_INZRT_APP
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
          DEBUG_INZRT_APP,
          capturePath
        ],
        (error) => {
          if (error) {
            console.error(
              "[INZRT Companion] open failed:",
              error
            );
            new import_obsidian.Notice(
              "Could not open INZRT"
            );
            return;
          }
          new import_obsidian.Notice(
            ideas.length === 1 ? "Sent to INZRT" : `Sent ${ideas.length} Ideas to INZRT`
          );
        }
      );
    } catch (error) {
      console.error(
        "[INZRT Companion] send failed:",
        error
      );
      new import_obsidian.Notice(
        "Could not send to INZRT"
      );
    }
  }
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB7XG4gIE1lbnUsXG4gIE1hcmtkb3duVmlldyxcbiAgTm90aWNlLFxuICBQbHVnaW4sXG4gIHJlcXVlc3RVcmwsXG4gIHNldEljb24sXG4gIFRBYnN0cmFjdEZpbGUsXG4gIFRGaWxlXG59IGZyb20gXCJvYnNpZGlhblwiO1xuXG5pbXBvcnQge1xuICBCdWZmZXJcbn0gZnJvbSBcIm5vZGU6YnVmZmVyXCI7XG5cbmltcG9ydCB7XG4gIGV4ZWNGaWxlXG59IGZyb20gXCJub2RlOmNoaWxkX3Byb2Nlc3NcIjtcblxuaW1wb3J0IHtcbiAgcmFuZG9tVVVJRFxufSBmcm9tIFwibm9kZTpjcnlwdG9cIjtcblxuaW1wb3J0IHtcbiAgZXhpc3RzU3luYyxcbiAgbWtkaXJTeW5jLFxuICB3cml0ZUZpbGVTeW5jXG59IGZyb20gXCJub2RlOmZzXCI7XG5cbmltcG9ydCB7XG4gIHRtcGRpclxufSBmcm9tIFwibm9kZTpvc1wiO1xuXG5pbXBvcnQge1xuICBqb2luXG59IGZyb20gXCJub2RlOnBhdGhcIjtcblxuXG5jb25zdCBERUJVR19JTlpSVF9BUFAgPVxuICBcIi90bXAvSU5aUlQtT2JzaWRpYW5DYXB0dXJlLTEuMS41OC9CdWlsZC9Qcm9kdWN0cy9EZWJ1Zy9JTlpSVC5hcHBcIjtcblxuXG5pbnRlcmZhY2UgQ2FwdHVyZUltYWdlIHtcbiAgZGF0YUJhc2U2NDogc3RyaW5nO1xuICBtaW1lVHlwZT86IHN0cmluZztcbiAgb3JpZ2luYWxGaWxlTmFtZT86IHN0cmluZztcbn1cblxuXG5pbnRlcmZhY2UgQ2FwdHVyZUlkZWEge1xuICBraW5kOlxuICAgIHwgXCJzZWxlY3Rpb25cIlxuICAgIHwgXCJub3RlXCJcbiAgICB8IFwiaW1hZ2VcIjtcblxuICBjb250ZW50Pzogc3RyaW5nO1xuICBpbWFnZT86IENhcHR1cmVJbWFnZTtcbiAgc291cmNlVGl0bGU/OiBzdHJpbmc7XG4gIHNvdXJjZVBhdGg/OiBzdHJpbmc7XG59XG5cblxuaW50ZXJmYWNlIENhcHR1cmVFbnZlbG9wZSB7XG4gIHZlcnNpb246IDE7XG4gIGlkZWFzOiBDYXB0dXJlSWRlYVtdO1xufVxuXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIElOWlJUQ29tcGFuaW9uUGx1Z2luXG4gIGV4dGVuZHMgUGx1Z2luXG57XG4gIHByaXZhdGUgZmxvYXRpbmdBY3Rpb25FbDpcbiAgICBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsO1xuXG4gIGFzeW5jIG9ubG9hZCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0aGlzLnJlZ2lzdGVyU2luZ2xlRmlsZU1lbnUoKTtcbiAgICB0aGlzLnJlZ2lzdGVyTXVsdGlGaWxlTWVudSgpO1xuICAgIHRoaXMucmVnaXN0ZXJGbG9hdGluZ0NhcHR1cmVBY3Rpb25zKCk7XG5cbiAgICBuZXcgTm90aWNlKFxuICAgICAgXCJJTlpSVCBDb21wYW5pb24gbG9hZGVkXCJcbiAgICApO1xuICB9XG5cblxuICAvKlxuICAgT2JzaWRpYW4gY3VycmVudGx5IGVtaXRzIGVkaXRvci1tZW51IGFuZFxuICAgZmlsZXMtbWVudSBhdCBydW50aW1lLlxuXG4gICBmaWxlcy1tZW51IGlzIG5vdCBjbGVhbmx5IHJlcHJlc2VudGVkIGluIGFsbFxuICAgcHVibGlzaGVkIFR5cGVTY3JpcHQgZGVjbGFyYXRpb24gdmVyc2lvbnMsIHNvXG4gICB0aGlzIHByb3RvdHlwZSBpbnRlbnRpb25hbGx5IGtlZXBzIHRoZSBydW50aW1lXG4gICBldmVudCBicmlkZ2UgdW50eXBlZCByYXRoZXIgdGhhbiBpbnZlbnRpbmdcbiAgIGNvbmZsaWN0aW5nIG92ZXJsb2Fkcy5cbiAgKi9cbiAgcHJpdmF0ZSBydW50aW1lV29ya3NwYWNlKCk6IGFueSB7XG4gICAgcmV0dXJuIHRoaXMuYXBwLndvcmtzcGFjZTtcbiAgfVxuXG5cbiAgcHJpdmF0ZSByZWdpc3RlclNpbmdsZUZpbGVNZW51KCk6XG4gICAgdm9pZFxuICB7XG4gICAgdGhpcy5yZWdpc3RlckV2ZW50KFxuICAgICAgdGhpcy5hcHAud29ya3NwYWNlLm9uKFxuICAgICAgICBcImZpbGUtbWVudVwiLFxuICAgICAgICAoXG4gICAgICAgICAgbWVudTogTWVudSxcbiAgICAgICAgICBmaWxlOiBUQWJzdHJhY3RGaWxlXG4gICAgICAgICkgPT4ge1xuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICEoZmlsZSBpbnN0YW5jZW9mIFRGaWxlKVxuICAgICAgICAgICkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGNvbnN0IGlzTWFya2Rvd24gPVxuICAgICAgICAgICAgZmlsZS5leHRlbnNpb25cbiAgICAgICAgICAgICAgLnRvTG93ZXJDYXNlKClcbiAgICAgICAgICAgICAgPT09IFwibWRcIjtcblxuICAgICAgICAgIGNvbnN0IGlzSW1hZ2UgPVxuICAgICAgICAgICAgdGhpcy5pc1N1cHBvcnRlZEltYWdlRmlsZShcbiAgICAgICAgICAgICAgZmlsZVxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICFpc01hcmtkb3duXG4gICAgICAgICAgICAmJlxuICAgICAgICAgICAgIWlzSW1hZ2VcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBtZW51LmFkZEl0ZW0oXG4gICAgICAgICAgICAoaXRlbSkgPT4ge1xuICAgICAgICAgICAgICBpdGVtXG4gICAgICAgICAgICAgICAgLnNldFRpdGxlKFxuICAgICAgICAgICAgICAgICAgXCJTZW5kIHRvIElOWlJUXCJcbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgLnNldEljb24oXCJzZW5kXCIpXG4gICAgICAgICAgICAgICAgLm9uQ2xpY2soXG4gICAgICAgICAgICAgICAgICBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlkZWEgPVxuICAgICAgICAgICAgICAgICAgICAgIGlzSW1hZ2VcbiAgICAgICAgICAgICAgICAgICAgICAgID8gYXdhaXQgdGhpc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5pZGVhRnJvbUltYWdlRmlsZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgICAgICAgICA6IGF3YWl0IHRoaXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAuaWRlYUZyb21GaWxlKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICAgICAgICAgIGlkZWFcbiAgICAgICAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZW5kUGF5bG9hZChbXG4gICAgICAgICAgICAgICAgICAgICAgICBpZGVhXG4gICAgICAgICAgICAgICAgICAgICAgXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIClcbiAgICApO1xuICB9XG5cblxuICBwcml2YXRlIHJlZ2lzdGVyTXVsdGlGaWxlTWVudSgpOlxuICAgIHZvaWRcbiAge1xuICAgIGNvbnN0IHdvcmtzcGFjZTogYW55ID1cbiAgICAgIHRoaXMucnVudGltZVdvcmtzcGFjZSgpO1xuXG4gICAgdGhpcy5yZWdpc3RlckV2ZW50KFxuICAgICAgd29ya3NwYWNlLm9uKFxuICAgICAgICBcImZpbGVzLW1lbnVcIixcbiAgICAgICAgKFxuICAgICAgICAgIG1lbnU6IE1lbnUsXG4gICAgICAgICAgZmlsZXM6IFRBYnN0cmFjdEZpbGVbXVxuICAgICAgICApID0+IHtcbiAgICAgICAgICBjb25zdCBub3RlcyA9XG4gICAgICAgICAgICBmaWxlcy5maWx0ZXIoXG4gICAgICAgICAgICAgIChcbiAgICAgICAgICAgICAgICBmaWxlXG4gICAgICAgICAgICAgICk6IGZpbGUgaXMgVEZpbGUgPT5cbiAgICAgICAgICAgICAgICBmaWxlIGluc3RhbmNlb2YgVEZpbGVcbiAgICAgICAgICAgICAgICAmJlxuICAgICAgICAgICAgICAgIGZpbGUuZXh0ZW5zaW9uXG4gICAgICAgICAgICAgICAgICAudG9Mb3dlckNhc2UoKVxuICAgICAgICAgICAgICAgICAgPT09IFwibWRcIlxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgIG5vdGVzLmxlbmd0aCA8IDJcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBtZW51LmFkZEl0ZW0oXG4gICAgICAgICAgICAoaXRlbTogYW55KSA9PiB7XG4gICAgICAgICAgICAgIGl0ZW1cbiAgICAgICAgICAgICAgICAuc2V0VGl0bGUoXG4gICAgICAgICAgICAgICAgICBcIlNlbmQgdG8gSU5aUlRcIlxuICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICAuc2V0SWNvbihcInNlbmRcIilcbiAgICAgICAgICAgICAgICAub25DbGljayhcbiAgICAgICAgICAgICAgICAgIGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaWRlYXMgPVxuICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgICAgICAgICAgICAgICAgICAgbm90ZXMubWFwKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAoZmlsZSkgPT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmlkZWFGcm9tRmlsZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNlbmRQYXlsb2FkKFxuICAgICAgICAgICAgICAgICAgICAgIGlkZWFzXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICApXG4gICAgKTtcbiAgfVxuXG5cbiAgcHJpdmF0ZSByZWdpc3RlckZsb2F0aW5nQ2FwdHVyZUFjdGlvbnMoKTpcbiAgICB2b2lkXG4gIHtcbiAgICAvKlxuICAgICBUZXh0IHNlbGVjdGlvbi5cblxuICAgICBXZSB1c2UgdGhlIE9ic2lkaWFuIGVkaXRvciBmb3IgdGhlIGFjdHVhbCB0ZXh0XG4gICAgIHdoZW5ldmVyIHBvc3NpYmxlLCBhbmQgRE9NIGdlb21ldHJ5IG9ubHkgdG9cbiAgICAgcG9zaXRpb24gdGhlIHZpc3VhbCBjYXBzdWxlLlxuICAgICAqL1xuICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChcbiAgICAgIGRvY3VtZW50LFxuICAgICAgXCJtb3VzZXVwXCIsXG4gICAgICAoKSA9PiB7XG4gICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KFxuICAgICAgICAgICgpID0+IHRoaXMuc2hvd1RleHRTZWxlY3Rpb25BY3Rpb24oKSxcbiAgICAgICAgICAwXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgKTtcblxuICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChcbiAgICAgIGRvY3VtZW50LFxuICAgICAgXCJrZXl1cFwiLFxuICAgICAgKGV2ZW50OiBLZXlib2FyZEV2ZW50KSA9PiB7XG4gICAgICAgIGlmIChldmVudC5rZXkgPT09IFwiRXNjYXBlXCIpIHtcbiAgICAgICAgICB0aGlzLmhpZGVGbG9hdGluZ0FjdGlvbigpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChcbiAgICAgICAgICBldmVudC5zaGlmdEtleVxuICAgICAgICAgIHx8IGV2ZW50LmtleS5zdGFydHNXaXRoKFwiQXJyb3dcIilcbiAgICAgICAgKSB7XG4gICAgICAgICAgd2luZG93LnNldFRpbWVvdXQoXG4gICAgICAgICAgICAoKSA9PiB0aGlzLnNob3dUZXh0U2VsZWN0aW9uQWN0aW9uKCksXG4gICAgICAgICAgICAwXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICk7XG5cbiAgICAvKlxuICAgICBJbWFnZSBjbGljay5cblxuICAgICBEbyBub3QgcHJldmVudERlZmF1bHQgb3Igc3RvcFByb3BhZ2F0aW9uLlxuICAgICBPYnNpZGlhbiByZW1haW5zIGZ1bGx5IHJlc3BvbnNpYmxlIGZvciBuYXRpdmVcbiAgICAgaW1hZ2Ugc2VsZWN0aW9uLCByZXNpemUgaGFuZGxlcyBhbmQgY29udHJvbHMuXG4gICAgICovXG4gICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KFxuICAgICAgZG9jdW1lbnQsXG4gICAgICBcImNsaWNrXCIsXG4gICAgICAoZXZlbnQ6IE1vdXNlRXZlbnQpID0+IHtcbiAgICAgICAgY29uc3QgdGFyZ2V0ID1cbiAgICAgICAgICBldmVudC50YXJnZXQgaW5zdGFuY2VvZiBFbGVtZW50XG4gICAgICAgICAgICA/IGV2ZW50LnRhcmdldFxuICAgICAgICAgICAgOiBudWxsO1xuXG4gICAgICAgIGlmICghdGFyZ2V0KSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKFxuICAgICAgICAgIHRoaXMuZmxvYXRpbmdBY3Rpb25FbFxuICAgICAgICAgICYmIHRoaXMuZmxvYXRpbmdBY3Rpb25FbC5jb250YWlucyh0YXJnZXQpXG4gICAgICAgICkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGltYWdlID1cbiAgICAgICAgICB0aGlzLmZpbmRDbGlja2VkSW1hZ2UodGFyZ2V0KTtcblxuICAgICAgICBpZiAoIWltYWdlKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKFxuICAgICAgICAgICFpbWFnZS5jbG9zZXN0KFxuICAgICAgICAgICAgXCIubWFya2Rvd24tc291cmNlLXZpZXcsIC5tYXJrZG93bi1wcmV2aWV3LXZpZXdcIlxuICAgICAgICAgIClcbiAgICAgICAgKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgeCA9IGV2ZW50LmNsaWVudFg7XG4gICAgICAgIGNvbnN0IHkgPSBldmVudC5jbGllbnRZO1xuXG4gICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KFxuICAgICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuc2hvd0ltYWdlQ2FwdHVyZUFjdGlvbihcbiAgICAgICAgICAgICAgaW1hZ2UsXG4gICAgICAgICAgICAgIHgsXG4gICAgICAgICAgICAgIHlcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICAwXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgKTtcblxuICAgIC8qXG4gICAgIEFueSBuZXcgaW50ZXJhY3Rpb24gb3V0c2lkZSB0aGUgY2Fwc3VsZSBkaXNtaXNzZXNcbiAgICAgdGhlIHByZXZpb3VzIGFjdGlvbi5cbiAgICAgKi9cbiAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoXG4gICAgICBkb2N1bWVudCxcbiAgICAgIFwicG9pbnRlcmRvd25cIixcbiAgICAgIChldmVudDogUG9pbnRlckV2ZW50KSA9PiB7XG4gICAgICAgIGNvbnN0IHRhcmdldCA9XG4gICAgICAgICAgZXZlbnQudGFyZ2V0IGluc3RhbmNlb2YgTm9kZVxuICAgICAgICAgICAgPyBldmVudC50YXJnZXRcbiAgICAgICAgICAgIDogbnVsbDtcblxuICAgICAgICBpZiAoXG4gICAgICAgICAgdGFyZ2V0XG4gICAgICAgICAgJiYgdGhpcy5mbG9hdGluZ0FjdGlvbkVsXG4gICAgICAgICAgJiYgdGhpcy5mbG9hdGluZ0FjdGlvbkVsLmNvbnRhaW5zKHRhcmdldClcbiAgICAgICAgKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5oaWRlRmxvYXRpbmdBY3Rpb24oKTtcbiAgICAgIH0sXG4gICAgICB0cnVlXG4gICAgKTtcblxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFxuICAgICAgXCJzY3JvbGxcIixcbiAgICAgIHRoaXMuaGlkZUZsb2F0aW5nQWN0aW9uQm91bmQsXG4gICAgICB0cnVlXG4gICAgKTtcblxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFxuICAgICAgXCJyZXNpemVcIixcbiAgICAgIHRoaXMuaGlkZUZsb2F0aW5nQWN0aW9uQm91bmRcbiAgICApO1xuXG4gICAgdGhpcy5yZWdpc3RlcihcbiAgICAgICgpID0+IHtcbiAgICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoXG4gICAgICAgICAgXCJzY3JvbGxcIixcbiAgICAgICAgICB0aGlzLmhpZGVGbG9hdGluZ0FjdGlvbkJvdW5kLFxuICAgICAgICAgIHRydWVcbiAgICAgICAgKTtcblxuICAgICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcihcbiAgICAgICAgICBcInJlc2l6ZVwiLFxuICAgICAgICAgIHRoaXMuaGlkZUZsb2F0aW5nQWN0aW9uQm91bmRcbiAgICAgICAgKTtcblxuICAgICAgICB0aGlzLmhpZGVGbG9hdGluZ0FjdGlvbigpO1xuICAgICAgfVxuICAgICk7XG4gIH1cblxuXG4gIHByaXZhdGUgaGlkZUZsb2F0aW5nQWN0aW9uQm91bmQgPVxuICAgICgpOiB2b2lkID0+IHtcbiAgICAgIHRoaXMuaGlkZUZsb2F0aW5nQWN0aW9uKCk7XG4gICAgfTtcblxuXG4gIHByaXZhdGUgZmluZENsaWNrZWRJbWFnZShcbiAgICBzdGFydDogRWxlbWVudFxuICApOiBIVE1MSW1hZ2VFbGVtZW50IHwgbnVsbFxuICB7XG4gICAgbGV0IGVsZW1lbnQ6IEVsZW1lbnQgfCBudWxsID1cbiAgICAgIHN0YXJ0O1xuXG4gICAgd2hpbGUgKGVsZW1lbnQpIHtcbiAgICAgIGlmIChcbiAgICAgICAgZWxlbWVudCBpbnN0YW5jZW9mIEhUTUxJbWFnZUVsZW1lbnRcbiAgICAgICkge1xuICAgICAgICByZXR1cm4gZWxlbWVudDtcbiAgICAgIH1cblxuICAgICAgZWxlbWVudCA9XG4gICAgICAgIGVsZW1lbnQucGFyZW50RWxlbWVudDtcbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG5cbiAgcHJpdmF0ZSBnZXRTZWxlY3Rpb25BbmNob3JSZWN0KFxuICAgIHZpZXc6IE1hcmtkb3duVmlldyB8IG51bGxcbiAgKTogRE9NUmVjdCB8IG51bGxcbiAge1xuICAgIGNvbnN0IHNlbGVjdGlvbiA9XG4gICAgICB3aW5kb3cuZ2V0U2VsZWN0aW9uKCk7XG5cbiAgICBpZiAoXG4gICAgICBzZWxlY3Rpb25cbiAgICAgICYmIHNlbGVjdGlvbi5yYW5nZUNvdW50ID4gMFxuICAgICAgJiYgIXNlbGVjdGlvbi5pc0NvbGxhcHNlZFxuICAgICkge1xuICAgICAgY29uc3QgcmFuZ2UgPVxuICAgICAgICBzZWxlY3Rpb24uZ2V0UmFuZ2VBdCgwKTtcblxuICAgICAgY29uc3QgY2xpZW50UmVjdHMgPVxuICAgICAgICBBcnJheS5mcm9tKFxuICAgICAgICAgIHJhbmdlLmdldENsaWVudFJlY3RzKClcbiAgICAgICAgKVxuICAgICAgICAuZmlsdGVyKFxuICAgICAgICAgIChyZWN0KSA9PlxuICAgICAgICAgICAgcmVjdC53aWR0aCA+IDBcbiAgICAgICAgICAgICYmIHJlY3QuaGVpZ2h0ID4gMFxuICAgICAgICApO1xuXG4gICAgICBpZiAoY2xpZW50UmVjdHMubGVuZ3RoID4gMCkge1xuICAgICAgICByZXR1cm4gY2xpZW50UmVjdHNbXG4gICAgICAgICAgY2xpZW50UmVjdHMubGVuZ3RoIC0gMVxuICAgICAgICBdO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBib3VuZGluZ1JlY3QgPVxuICAgICAgICByYW5nZS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblxuICAgICAgaWYgKFxuICAgICAgICBib3VuZGluZ1JlY3Qud2lkdGggPiAwXG4gICAgICAgIHx8IGJvdW5kaW5nUmVjdC5oZWlnaHQgPiAwXG4gICAgICApIHtcbiAgICAgICAgcmV0dXJuIGJvdW5kaW5nUmVjdDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKlxuICAgICBMaXZlIFByZXZpZXcgZmFsbGJhY2suXG5cbiAgICAgQ29kZU1pcnJvciByZW5kZXJzIHNlbGVjdGVkIHJlZ2lvbnMgYXNcbiAgICAgY20tc2VsZWN0aW9uQmFja2dyb3VuZCBlbGVtZW50cy5cbiAgICAgKi9cbiAgICBpZiAodmlldykge1xuICAgICAgY29uc3Qgc2VsZWN0aW9uUmVjdHMgPVxuICAgICAgICBBcnJheS5mcm9tKFxuICAgICAgICAgIHZpZXcuY29udGFpbmVyRWwucXVlcnlTZWxlY3RvckFsbDxIVE1MRWxlbWVudD4oXG4gICAgICAgICAgICBcIi5jbS1zZWxlY3Rpb25CYWNrZ3JvdW5kXCJcbiAgICAgICAgICApXG4gICAgICAgIClcbiAgICAgICAgLm1hcChcbiAgICAgICAgICAoZWxlbWVudCkgPT5cbiAgICAgICAgICAgIGVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KClcbiAgICAgICAgKVxuICAgICAgICAuZmlsdGVyKFxuICAgICAgICAgIChyZWN0KSA9PlxuICAgICAgICAgICAgcmVjdC53aWR0aCA+IDBcbiAgICAgICAgICAgICYmIHJlY3QuaGVpZ2h0ID4gMFxuICAgICAgICApO1xuXG4gICAgICBpZiAoc2VsZWN0aW9uUmVjdHMubGVuZ3RoID4gMCkge1xuICAgICAgICByZXR1cm4gc2VsZWN0aW9uUmVjdHNbXG4gICAgICAgICAgc2VsZWN0aW9uUmVjdHMubGVuZ3RoIC0gMVxuICAgICAgICBdO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9XG5cblxuICBwcml2YXRlIHNob3dUZXh0U2VsZWN0aW9uQWN0aW9uKCk6XG4gICAgdm9pZFxuICB7XG4gICAgY29uc3QgdmlldyA9XG4gICAgICB0aGlzLmFwcC53b3Jrc3BhY2VcbiAgICAgICAgLmdldEFjdGl2ZVZpZXdPZlR5cGUoXG4gICAgICAgICAgTWFya2Rvd25WaWV3XG4gICAgICAgICk7XG5cbiAgICBjb25zdCBlZGl0b3JTZWxlY3Rpb24gPVxuICAgICAgdmlldz8uZWRpdG9yLmdldFNlbGVjdGlvbigpXG4gICAgICA/PyBcIlwiO1xuXG4gICAgY29uc3QgZG9tU2VsZWN0aW9uID1cbiAgICAgIHdpbmRvdy5nZXRTZWxlY3Rpb24oKVxuICAgICAgICA/LnRvU3RyaW5nKClcbiAgICAgID8/IFwiXCI7XG5cbiAgICBjb25zdCBzZWxlY3RlZFRleHQgPVxuICAgICAgZWRpdG9yU2VsZWN0aW9uLnRyaW0oKS5sZW5ndGggPiAwXG4gICAgICAgID8gZWRpdG9yU2VsZWN0aW9uXG4gICAgICAgIDogZG9tU2VsZWN0aW9uO1xuXG4gICAgaWYgKFxuICAgICAgc2VsZWN0ZWRUZXh0LnRyaW0oKS5sZW5ndGggPT09IDBcbiAgICApIHtcbiAgICAgIHRoaXMuaGlkZUZsb2F0aW5nQWN0aW9uKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgYW5jaG9yUmVjdCA9XG4gICAgICB0aGlzLmdldFNlbGVjdGlvbkFuY2hvclJlY3QoXG4gICAgICAgIHZpZXdcbiAgICAgICk7XG5cbiAgICBpZiAoIWFuY2hvclJlY3QpIHtcbiAgICAgIHRoaXMuaGlkZUZsb2F0aW5nQWN0aW9uKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgYWN0aXZlRmlsZSA9XG4gICAgICB2aWV3Py5maWxlXG4gICAgICA/PyB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0QWN0aXZlRmlsZSgpO1xuXG4gICAgLypcbiAgICAgSU5aUlQtc3R5bGUgcG9zaXRpb246XG4gICAgIGFsaWduZWQgdG8gdGhlIGVuZCBvZiB0aGUgc2VsZWN0ZWQgdGV4dCBhbmRcbiAgICAgc2xpZ2h0bHkgYWJvdmUgaXQgd2hlbiByb29tIGlzIGF2YWlsYWJsZS5cbiAgICAgKi9cbiAgICBjb25zdCByZXF1ZXN0ZWRYID1cbiAgICAgIGFuY2hvclJlY3QucmlnaHQgLSA2ODtcblxuICAgIGNvbnN0IHJlcXVlc3RlZFkgPVxuICAgICAgYW5jaG9yUmVjdC50b3AgPj0gMzhcbiAgICAgICAgPyBhbmNob3JSZWN0LnRvcCAtIDM2XG4gICAgICAgIDogYW5jaG9yUmVjdC5ib3R0b20gKyA2O1xuXG4gICAgdGhpcy5zaG93RmxvYXRpbmdBY3Rpb24oXG4gICAgICByZXF1ZXN0ZWRYLFxuICAgICAgcmVxdWVzdGVkWSxcbiAgICAgICgpID0+IHtcbiAgICAgICAgdGhpcy5zZW5kUGF5bG9hZChbXG4gICAgICAgICAge1xuICAgICAgICAgICAga2luZDogXCJzZWxlY3Rpb25cIixcbiAgICAgICAgICAgIGNvbnRlbnQ6IHNlbGVjdGVkVGV4dCxcbiAgICAgICAgICAgIHNvdXJjZVRpdGxlOlxuICAgICAgICAgICAgICBhY3RpdmVGaWxlPy5iYXNlbmFtZSxcbiAgICAgICAgICAgIHNvdXJjZVBhdGg6XG4gICAgICAgICAgICAgIGFjdGl2ZUZpbGU/LnBhdGhcbiAgICAgICAgICB9XG4gICAgICAgIF0pO1xuICAgICAgfVxuICAgICk7XG4gIH1cblxuXG4gIHByaXZhdGUgc2hvd0ltYWdlQ2FwdHVyZUFjdGlvbihcbiAgICBpbWFnZTogSFRNTEltYWdlRWxlbWVudCxcbiAgICBjbGlja1g6IG51bWJlcixcbiAgICBjbGlja1k6IG51bWJlclxuICApOiB2b2lkXG4gIHtcbiAgICAvKlxuICAgICBQb3NpdGlvbiB0aGUgY2Fwc3VsZSBuZXh0IHRvIHRoZSBjbGljayByYXRoZXJcbiAgICAgdGhhbiBpbiBhIGZpeGVkIGltYWdlIGNvcm5lci4gVGhpcyBhdm9pZHNcbiAgICAgT2JzaWRpYW4ncyBvd24gem9vbS9zb3VyY2UgY29udHJvbHMgYW5kIHJlc2l6ZVxuICAgICBoYW5kbGUuXG4gICAgICovXG4gICAgY29uc3QgcmVxdWVzdGVkWCA9XG4gICAgICBjbGlja1ggLSAzNDtcblxuICAgIGNvbnN0IHJlcXVlc3RlZFkgPVxuICAgICAgY2xpY2tZID49IDQwXG4gICAgICAgID8gY2xpY2tZIC0gMzhcbiAgICAgICAgOiBjbGlja1kgKyAxMDtcblxuICAgIHRoaXMuc2hvd0Zsb2F0aW5nQWN0aW9uKFxuICAgICAgcmVxdWVzdGVkWCxcbiAgICAgIHJlcXVlc3RlZFksXG4gICAgICAoKSA9PiB7XG4gICAgICAgIHZvaWQgdGhpcy5zZW5kQ2xpY2tlZEltYWdlKFxuICAgICAgICAgIGltYWdlXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgKTtcbiAgfVxuXG5cbiAgcHJpdmF0ZSBhc3luYyBzZW5kQ2xpY2tlZEltYWdlKFxuICAgIGltYWdlOiBIVE1MSW1hZ2VFbGVtZW50XG4gICk6IFByb21pc2U8dm9pZD5cbiAge1xuICAgIGNvbnN0IHNvdXJjZUNhbmRpZGF0ZXMgPVxuICAgICAgW1xuICAgICAgICBpbWFnZS5jdXJyZW50U3JjLFxuICAgICAgICBpbWFnZS5nZXRBdHRyaWJ1dGUoXCJzcmNcIiksXG4gICAgICAgIGltYWdlLmdldEF0dHJpYnV0ZShcImRhdGEtc3JjXCIpXG4gICAgICBdXG4gICAgICAuZmlsdGVyKFxuICAgICAgICAodmFsdWUpOiB2YWx1ZSBpcyBzdHJpbmcgPT5cbiAgICAgICAgICBCb29sZWFuKHZhbHVlKVxuICAgICAgKTtcblxuICAgIGNvbnN0IHJlbW90ZVNvdXJjZSA9XG4gICAgICBzb3VyY2VDYW5kaWRhdGVzLmZpbmQoXG4gICAgICAgICh2YWx1ZSkgPT5cbiAgICAgICAgICB2YWx1ZS5zdGFydHNXaXRoKFwiaHR0cHM6Ly9cIilcbiAgICAgICAgICB8fCB2YWx1ZS5zdGFydHNXaXRoKFwiaHR0cDovL1wiKVxuICAgICAgKTtcblxuICAgIGxldCBpZGVhOlxuICAgICAgQ2FwdHVyZUlkZWEgfCBudWxsID1cbiAgICAgICAgbnVsbDtcblxuICAgIGlmIChyZW1vdGVTb3VyY2UpIHtcbiAgICAgIGlkZWEgPVxuICAgICAgICBhd2FpdCB0aGlzLmlkZWFGcm9tUmVtb3RlSW1hZ2UoXG4gICAgICAgICAgcmVtb3RlU291cmNlXG4gICAgICAgICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGZpbGUgPVxuICAgICAgICB0aGlzLnJlc29sdmVJbWFnZUZpbGVGcm9tRWxlbWVudChcbiAgICAgICAgICBpbWFnZSxcbiAgICAgICAgICBzb3VyY2VDYW5kaWRhdGVzXG4gICAgICAgICk7XG5cbiAgICAgIGlmICghZmlsZSkge1xuICAgICAgICBuZXcgTm90aWNlKFxuICAgICAgICAgIFwiQ291bGQgbm90IGxvY2F0ZSBpbWFnZSBpbiB2YXVsdFwiXG4gICAgICAgICk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWRlYSA9XG4gICAgICAgIGF3YWl0IHRoaXMuaWRlYUZyb21JbWFnZUZpbGUoXG4gICAgICAgICAgZmlsZVxuICAgICAgICApO1xuICAgIH1cblxuICAgIGlmIChpZGVhKSB7XG4gICAgICB0aGlzLnNlbmRQYXlsb2FkKFtcbiAgICAgICAgaWRlYVxuICAgICAgXSk7XG4gICAgfVxuICB9XG5cblxuICBwcml2YXRlIHJlc29sdmVJbWFnZUZpbGVGcm9tRWxlbWVudChcbiAgICBpbWFnZTogSFRNTEltYWdlRWxlbWVudCxcbiAgICBzb3VyY2VDYW5kaWRhdGVzOiBzdHJpbmdbXVxuICApOiBURmlsZSB8IG51bGxcbiAge1xuICAgIGNvbnN0IGNhbmRpZGF0ZXM6XG4gICAgICBzdHJpbmdbXSA9IFtdO1xuXG4gICAgY29uc3QgYWRkQ2FuZGlkYXRlID1cbiAgICAgIChcbiAgICAgICAgcmF3OlxuICAgICAgICAgIHN0cmluZyB8IG51bGwgfCB1bmRlZmluZWRcbiAgICAgICkgPT4ge1xuICAgICAgICBpZiAoIXJhdykge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCB2YWx1ZSA9IHJhdztcblxuICAgICAgICB0cnkge1xuICAgICAgICAgIHZhbHVlID1cbiAgICAgICAgICAgIGRlY29kZVVSSUNvbXBvbmVudChcbiAgICAgICAgICAgICAgdmFsdWVcbiAgICAgICAgICAgICk7XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIC8vIEtlZXAgb3JpZ2luYWwgdmFsdWUuXG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBxdWVyeUluZGV4ID1cbiAgICAgICAgICB2YWx1ZS5pbmRleE9mKFwiP1wiKTtcblxuICAgICAgICBpZiAocXVlcnlJbmRleCA+PSAwKSB7XG4gICAgICAgICAgdmFsdWUgPVxuICAgICAgICAgICAgdmFsdWUuc3Vic3RyaW5nKFxuICAgICAgICAgICAgICAwLFxuICAgICAgICAgICAgICBxdWVyeUluZGV4XG4gICAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgaGFzaEluZGV4ID1cbiAgICAgICAgICB2YWx1ZS5pbmRleE9mKFwiI1wiKTtcblxuICAgICAgICBpZiAoaGFzaEluZGV4ID49IDApIHtcbiAgICAgICAgICB2YWx1ZSA9XG4gICAgICAgICAgICB2YWx1ZS5zdWJzdHJpbmcoXG4gICAgICAgICAgICAgIDAsXG4gICAgICAgICAgICAgIGhhc2hJbmRleFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNhbmRpZGF0ZXMucHVzaCh2YWx1ZSk7XG4gICAgICB9O1xuXG4gICAgZm9yIChcbiAgICAgIGNvbnN0IHNvdXJjZVxuICAgICAgb2Ygc291cmNlQ2FuZGlkYXRlc1xuICAgICkge1xuICAgICAgYWRkQ2FuZGlkYXRlKHNvdXJjZSk7XG4gICAgfVxuXG4gICAgYWRkQ2FuZGlkYXRlKFxuICAgICAgaW1hZ2UuZ2V0QXR0cmlidXRlKFwiZGF0YS1wYXRoXCIpXG4gICAgKTtcblxuICAgIGFkZENhbmRpZGF0ZShcbiAgICAgIGltYWdlLmdldEF0dHJpYnV0ZShcImFsdFwiKVxuICAgICk7XG5cbiAgICBjb25zdCBpbWFnZUZpbGVzID1cbiAgICAgIHRoaXMuYXBwLnZhdWx0XG4gICAgICAgIC5nZXRGaWxlcygpXG4gICAgICAgIC5maWx0ZXIoXG4gICAgICAgICAgKGZpbGUpID0+XG4gICAgICAgICAgICB0aGlzLmlzU3VwcG9ydGVkSW1hZ2VGaWxlKFxuICAgICAgICAgICAgICBmaWxlXG4gICAgICAgICAgICApXG4gICAgICAgICk7XG5cbiAgICAvKlxuICAgICBQcmVmZXIgZXhhY3QvZnVsbC1wYXRoIHJlc29sdXRpb24uXG4gICAgICovXG4gICAgZm9yIChcbiAgICAgIGNvbnN0IGNhbmRpZGF0ZVxuICAgICAgb2YgY2FuZGlkYXRlc1xuICAgICkge1xuICAgICAgZm9yIChcbiAgICAgICAgY29uc3QgZmlsZVxuICAgICAgICBvZiBpbWFnZUZpbGVzXG4gICAgICApIHtcbiAgICAgICAgaWYgKFxuICAgICAgICAgIGNhbmRpZGF0ZSA9PT0gZmlsZS5wYXRoXG4gICAgICAgICAgfHwgY2FuZGlkYXRlLmVuZHNXaXRoKFxuICAgICAgICAgICAgXCIvXCIgKyBmaWxlLnBhdGhcbiAgICAgICAgICApXG4gICAgICAgICAgfHwgY2FuZGlkYXRlLmVuZHNXaXRoKFxuICAgICAgICAgICAgZmlsZS5wYXRoXG4gICAgICAgICAgKVxuICAgICAgICApIHtcbiAgICAgICAgICByZXR1cm4gZmlsZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8qXG4gICAgIEZpbGVuYW1lIGZhbGxiYWNrIG9ubHkgd2hlbiB0aGVyZSBpcyBleGFjdGx5XG4gICAgIG9uZSBtYXRjaGluZyBpbWFnZSBpbiB0aGUgdmF1bHQuXG4gICAgICovXG4gICAgZm9yIChcbiAgICAgIGNvbnN0IGNhbmRpZGF0ZVxuICAgICAgb2YgY2FuZGlkYXRlc1xuICAgICkge1xuICAgICAgY29uc3QgZmlsZW5hbWUgPVxuICAgICAgICBjYW5kaWRhdGVcbiAgICAgICAgICAuc3BsaXQoXCIvXCIpXG4gICAgICAgICAgLmZpbHRlcihCb29sZWFuKVxuICAgICAgICAgIC5wb3AoKTtcblxuICAgICAgaWYgKCFmaWxlbmFtZSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgbWF0Y2hlcyA9XG4gICAgICAgIGltYWdlRmlsZXMuZmlsdGVyKFxuICAgICAgICAgIChmaWxlKSA9PlxuICAgICAgICAgICAgZmlsZS5uYW1lID09PSBmaWxlbmFtZVxuICAgICAgICApO1xuXG4gICAgICBpZiAobWF0Y2hlcy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgcmV0dXJuIG1hdGNoZXNbMF07XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuXG4gIHByaXZhdGUgc2hvd0Zsb2F0aW5nQWN0aW9uKFxuICAgIHJlcXVlc3RlZFg6IG51bWJlcixcbiAgICByZXF1ZXN0ZWRZOiBudW1iZXIsXG4gICAgYWN0aW9uOiAoKSA9PiB2b2lkXG4gICk6IHZvaWRcbiAge1xuICAgIHRoaXMuaGlkZUZsb2F0aW5nQWN0aW9uKCk7XG5cbiAgICBjb25zdCBidXR0b24gPVxuICAgICAgZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcbiAgICAgICAgXCJidXR0b25cIlxuICAgICAgKTtcblxuICAgIGJ1dHRvbi50eXBlID1cbiAgICAgIFwiYnV0dG9uXCI7XG5cbiAgICBidXR0b24uY2xhc3NOYW1lID1cbiAgICAgIFwiaW56cnQtY2FwdHVyZS1idWJibGVcIjtcblxuICAgIGJ1dHRvbi5zZXRBdHRyaWJ1dGUoXG4gICAgICBcImFyaWEtbGFiZWxcIixcbiAgICAgIFwiU2VuZCB0byBJTlpSVFwiXG4gICAgKTtcblxuICAgIGNvbnN0IGljb24gPVxuICAgICAgZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcbiAgICAgICAgXCJzcGFuXCJcbiAgICAgICk7XG5cbiAgICBpY29uLmNsYXNzTmFtZSA9XG4gICAgICBcImluenJ0LWNhcHR1cmUtYnViYmxlLWljb25cIjtcblxuICAgIHNldEljb24oXG4gICAgICBpY29uLFxuICAgICAgXCJzZW5kXCJcbiAgICApO1xuXG4gICAgY29uc3QgbGFiZWwgPVxuICAgICAgZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcbiAgICAgICAgXCJzcGFuXCJcbiAgICAgICk7XG5cbiAgICBsYWJlbC5jbGFzc05hbWUgPVxuICAgICAgXCJpbnpydC1jYXB0dXJlLWJ1YmJsZS1sYWJlbFwiO1xuXG4gICAgbGFiZWwudGV4dENvbnRlbnQgPVxuICAgICAgXCJJTlpSVFwiO1xuXG4gICAgYnV0dG9uLmFwcGVuZENoaWxkKFxuICAgICAgaWNvblxuICAgICk7XG5cbiAgICBidXR0b24uYXBwZW5kQ2hpbGQoXG4gICAgICBsYWJlbFxuICAgICk7XG5cbiAgICBidXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgIFwicG9pbnRlcmRvd25cIixcbiAgICAgIChldmVudCkgPT4ge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgIH1cbiAgICApO1xuXG4gICAgYnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXG4gICAgICBcImNsaWNrXCIsXG4gICAgICAoZXZlbnQpID0+IHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cbiAgICAgICAgdGhpcy5oaWRlRmxvYXRpbmdBY3Rpb24oKTtcblxuICAgICAgICBhY3Rpb24oKTtcbiAgICAgIH1cbiAgICApO1xuXG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChcbiAgICAgIGJ1dHRvblxuICAgICk7XG5cbiAgICB0aGlzLmZsb2F0aW5nQWN0aW9uRWwgPVxuICAgICAgYnV0dG9uO1xuXG4gICAgY29uc3QgcmVjdCA9XG4gICAgICBidXR0b24uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICBjb25zdCBtYXJnaW4gPVxuICAgICAgODtcblxuICAgIGNvbnN0IHggPVxuICAgICAgTWF0aC5tYXgoXG4gICAgICAgIG1hcmdpbixcbiAgICAgICAgTWF0aC5taW4oXG4gICAgICAgICAgcmVxdWVzdGVkWCxcbiAgICAgICAgICB3aW5kb3cuaW5uZXJXaWR0aFxuICAgICAgICAgICAgLSByZWN0LndpZHRoXG4gICAgICAgICAgICAtIG1hcmdpblxuICAgICAgICApXG4gICAgICApO1xuXG4gICAgY29uc3QgeSA9XG4gICAgICBNYXRoLm1heChcbiAgICAgICAgbWFyZ2luLFxuICAgICAgICBNYXRoLm1pbihcbiAgICAgICAgICByZXF1ZXN0ZWRZLFxuICAgICAgICAgIHdpbmRvdy5pbm5lckhlaWdodFxuICAgICAgICAgICAgLSByZWN0LmhlaWdodFxuICAgICAgICAgICAgLSBtYXJnaW5cbiAgICAgICAgKVxuICAgICAgKTtcblxuICAgIGJ1dHRvbi5zdHlsZS5sZWZ0ID1cbiAgICAgIGAke3h9cHhgO1xuXG4gICAgYnV0dG9uLnN0eWxlLnRvcCA9XG4gICAgICBgJHt5fXB4YDtcbiAgfVxuXG5cbiAgcHJpdmF0ZSBoaWRlRmxvYXRpbmdBY3Rpb24oKTpcbiAgICB2b2lkXG4gIHtcbiAgICB0aGlzLmZsb2F0aW5nQWN0aW9uRWxcbiAgICAgID8ucmVtb3ZlKCk7XG5cbiAgICB0aGlzLmZsb2F0aW5nQWN0aW9uRWwgPVxuICAgICAgbnVsbDtcbiAgfVxuXG5cbiAgcHJpdmF0ZSBpc1N1cHBvcnRlZEltYWdlRmlsZShcbiAgICBmaWxlOiBURmlsZVxuICApOiBib29sZWFuIHtcbiAgICByZXR1cm4gW1xuICAgICAgXCJwbmdcIixcbiAgICAgIFwianBnXCIsXG4gICAgICBcImpwZWdcIixcbiAgICAgIFwid2VicFwiLFxuICAgICAgXCJnaWZcIixcbiAgICAgIFwiaGVpY1wiLFxuICAgICAgXCJoZWlmXCIsXG4gICAgICBcInRpZlwiLFxuICAgICAgXCJ0aWZmXCJcbiAgICBdLmluY2x1ZGVzKFxuICAgICAgZmlsZS5leHRlbnNpb25cbiAgICAgICAgLnRvTG93ZXJDYXNlKClcbiAgICApO1xuICB9XG5cblxuICBwcml2YXRlIG1pbWVUeXBlRm9yRXh0ZW5zaW9uKFxuICAgIGV4dGVuc2lvbjogc3RyaW5nXG4gICk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgc3dpdGNoIChcbiAgICAgIGV4dGVuc2lvbi50b0xvd2VyQ2FzZSgpXG4gICAgKSB7XG4gICAgICBjYXNlIFwicG5nXCI6XG4gICAgICAgIHJldHVybiBcImltYWdlL3BuZ1wiO1xuXG4gICAgICBjYXNlIFwianBnXCI6XG4gICAgICBjYXNlIFwianBlZ1wiOlxuICAgICAgICByZXR1cm4gXCJpbWFnZS9qcGVnXCI7XG5cbiAgICAgIGNhc2UgXCJ3ZWJwXCI6XG4gICAgICAgIHJldHVybiBcImltYWdlL3dlYnBcIjtcblxuICAgICAgY2FzZSBcImdpZlwiOlxuICAgICAgICByZXR1cm4gXCJpbWFnZS9naWZcIjtcblxuICAgICAgY2FzZSBcImhlaWNcIjpcbiAgICAgICAgcmV0dXJuIFwiaW1hZ2UvaGVpY1wiO1xuXG4gICAgICBjYXNlIFwiaGVpZlwiOlxuICAgICAgICByZXR1cm4gXCJpbWFnZS9oZWlmXCI7XG5cbiAgICAgIGNhc2UgXCJ0aWZcIjpcbiAgICAgIGNhc2UgXCJ0aWZmXCI6XG4gICAgICAgIHJldHVybiBcImltYWdlL3RpZmZcIjtcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuXG4gIHByaXZhdGUgYXN5bmMgaWRlYUZyb21JbWFnZUZpbGUoXG4gICAgZmlsZTogVEZpbGVcbiAgKTogUHJvbWlzZTxDYXB0dXJlSWRlYSB8IG51bGw+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgZGF0YSA9XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0XG4gICAgICAgICAgLnJlYWRCaW5hcnkoXG4gICAgICAgICAgICBmaWxlXG4gICAgICAgICAgKTtcblxuICAgICAgaWYgKFxuICAgICAgICBkYXRhLmJ5dGVMZW5ndGggPT09IDBcbiAgICAgICkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgXCJJbWFnZSBmaWxlIGlzIGVtcHR5XCJcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAga2luZDpcbiAgICAgICAgICBcImltYWdlXCIsXG5cbiAgICAgICAgaW1hZ2U6IHtcbiAgICAgICAgICBkYXRhQmFzZTY0OlxuICAgICAgICAgICAgQnVmZmVyXG4gICAgICAgICAgICAgIC5mcm9tKGRhdGEpXG4gICAgICAgICAgICAgIC50b1N0cmluZyhcbiAgICAgICAgICAgICAgICBcImJhc2U2NFwiXG4gICAgICAgICAgICAgICksXG5cbiAgICAgICAgICBtaW1lVHlwZTpcbiAgICAgICAgICAgIHRoaXMubWltZVR5cGVGb3JFeHRlbnNpb24oXG4gICAgICAgICAgICAgIGZpbGUuZXh0ZW5zaW9uXG4gICAgICAgICAgICApLFxuXG4gICAgICAgICAgb3JpZ2luYWxGaWxlTmFtZTpcbiAgICAgICAgICAgIGZpbGUubmFtZVxuICAgICAgICB9LFxuXG4gICAgICAgIHNvdXJjZVRpdGxlOlxuICAgICAgICAgIGZpbGUuYmFzZW5hbWUsXG5cbiAgICAgICAgc291cmNlUGF0aDpcbiAgICAgICAgICBmaWxlLnBhdGhcbiAgICAgIH07XG4gICAgfSBjYXRjaCAoXG4gICAgICBlcnJvclxuICAgICkge1xuICAgICAgY29uc29sZS5lcnJvcihcbiAgICAgICAgXCJbSU5aUlQgQ29tcGFuaW9uXSBsb2NhbCBpbWFnZSByZWFkIGZhaWxlZDpcIixcbiAgICAgICAgZXJyb3JcbiAgICAgICk7XG5cbiAgICAgIG5ldyBOb3RpY2UoXG4gICAgICAgIFwiQ291bGQgbm90IHJlYWQgaW1hZ2VcIlxuICAgICAgKTtcblxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cblxuICBwcml2YXRlIGFzeW5jIGlkZWFGcm9tUmVtb3RlSW1hZ2UoXG4gICAgcmF3VXJsOiBzdHJpbmdcbiAgKTogUHJvbWlzZTxDYXB0dXJlSWRlYSB8IG51bGw+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPVxuICAgICAgICBhd2FpdCByZXF1ZXN0VXJsKHtcbiAgICAgICAgICB1cmw6XG4gICAgICAgICAgICByYXdVcmwsXG5cbiAgICAgICAgICBtZXRob2Q6XG4gICAgICAgICAgICBcIkdFVFwiLFxuXG4gICAgICAgICAgdGhyb3c6XG4gICAgICAgICAgICBmYWxzZVxuICAgICAgICB9KTtcblxuICAgICAgaWYgKFxuICAgICAgICByZXNwb25zZS5zdGF0dXMgPCAyMDBcbiAgICAgICAgfHxcbiAgICAgICAgcmVzcG9uc2Uuc3RhdHVzID49IDMwMFxuICAgICAgKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgSFRUUCAke3Jlc3BvbnNlLnN0YXR1c31gXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIGlmIChcbiAgICAgICAgcmVzcG9uc2UuYXJyYXlCdWZmZXIuYnl0ZUxlbmd0aFxuICAgICAgICAgID09PSAwXG4gICAgICApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIFwiRG93bmxvYWRlZCBpbWFnZSBpcyBlbXB0eVwiXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGNvbnRlbnRUeXBlRW50cnkgPVxuICAgICAgICBPYmplY3QuZW50cmllcyhcbiAgICAgICAgICByZXNwb25zZS5oZWFkZXJzXG4gICAgICAgIClcbiAgICAgICAgLmZpbmQoXG4gICAgICAgICAgKFtrZXldKSA9PlxuICAgICAgICAgICAga2V5LnRvTG93ZXJDYXNlKClcbiAgICAgICAgICAgICAgPT09IFwiY29udGVudC10eXBlXCJcbiAgICAgICAgKTtcblxuICAgICAgY29uc3QgcmVzcG9uc2VNaW1lVHlwZSA9XG4gICAgICAgIGNvbnRlbnRUeXBlRW50cnlcbiAgICAgICAgICA/IFN0cmluZyhcbiAgICAgICAgICAgICAgY29udGVudFR5cGVFbnRyeVsxXVxuICAgICAgICAgICAgKVxuICAgICAgICAgICAgLnNwbGl0KFwiO1wiKVswXVxuICAgICAgICAgICAgLnRyaW0oKVxuICAgICAgICAgIDogdW5kZWZpbmVkO1xuXG4gICAgICBjb25zdCBwYXJzZWQgPVxuICAgICAgICBuZXcgVVJMKFxuICAgICAgICAgIHJhd1VybFxuICAgICAgICApO1xuXG4gICAgICBjb25zdCByYXdGaWxlTmFtZSA9XG4gICAgICAgIHBhcnNlZC5wYXRobmFtZVxuICAgICAgICAgIC5zcGxpdChcIi9cIilcbiAgICAgICAgICAuZmlsdGVyKEJvb2xlYW4pXG4gICAgICAgICAgLnBvcCgpO1xuXG4gICAgICBjb25zdCBvcmlnaW5hbEZpbGVOYW1lID1cbiAgICAgICAgcmF3RmlsZU5hbWVcbiAgICAgICAgICA/IGRlY29kZVVSSUNvbXBvbmVudChcbiAgICAgICAgICAgICAgcmF3RmlsZU5hbWVcbiAgICAgICAgICAgIClcbiAgICAgICAgICA6IHVuZGVmaW5lZDtcblxuICAgICAgY29uc3QgZXh0ZW5zaW9uID1cbiAgICAgICAgb3JpZ2luYWxGaWxlTmFtZVxuICAgICAgICAgID8uc3BsaXQoXCIuXCIpXG4gICAgICAgICAgLnBvcCgpXG4gICAgICAgICAgPy50b0xvd2VyQ2FzZSgpO1xuXG4gICAgICBjb25zdCBtaW1lVHlwZSA9XG4gICAgICAgIHJlc3BvbnNlTWltZVR5cGVcbiAgICAgICAgICA/LnRvTG93ZXJDYXNlKClcbiAgICAgICAgICAuc3RhcnRzV2l0aChcbiAgICAgICAgICAgIFwiaW1hZ2UvXCJcbiAgICAgICAgICApXG4gICAgICAgICAgPyByZXNwb25zZU1pbWVUeXBlXG4gICAgICAgICAgOiBleHRlbnNpb25cbiAgICAgICAgICAgID8gdGhpc1xuICAgICAgICAgICAgICAgIC5taW1lVHlwZUZvckV4dGVuc2lvbihcbiAgICAgICAgICAgICAgICAgIGV4dGVuc2lvblxuICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgIDogdW5kZWZpbmVkO1xuXG4gICAgICBpZiAoXG4gICAgICAgICFtaW1lVHlwZVxuICAgICAgKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBcIkRvd25sb2FkZWQgcmVzb3VyY2UgaXMgbm90IGEgc3VwcG9ydGVkIGltYWdlXCJcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAga2luZDpcbiAgICAgICAgICBcImltYWdlXCIsXG5cbiAgICAgICAgaW1hZ2U6IHtcbiAgICAgICAgICBkYXRhQmFzZTY0OlxuICAgICAgICAgICAgQnVmZmVyXG4gICAgICAgICAgICAgIC5mcm9tKFxuICAgICAgICAgICAgICAgIHJlc3BvbnNlLmFycmF5QnVmZmVyXG4gICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgLnRvU3RyaW5nKFxuICAgICAgICAgICAgICAgIFwiYmFzZTY0XCJcbiAgICAgICAgICAgICAgKSxcblxuICAgICAgICAgIG1pbWVUeXBlLFxuXG4gICAgICAgICAgb3JpZ2luYWxGaWxlTmFtZVxuICAgICAgICB9LFxuXG4gICAgICAgIHNvdXJjZVRpdGxlOlxuICAgICAgICAgIG9yaWdpbmFsRmlsZU5hbWUsXG5cbiAgICAgICAgc291cmNlUGF0aDpcbiAgICAgICAgICByYXdVcmxcbiAgICAgIH07XG4gICAgfSBjYXRjaCAoXG4gICAgICBlcnJvclxuICAgICkge1xuICAgICAgY29uc29sZS5lcnJvcihcbiAgICAgICAgXCJbSU5aUlQgQ29tcGFuaW9uXSByZW1vdGUgaW1hZ2UgZG93bmxvYWQgZmFpbGVkOlwiLFxuICAgICAgICBlcnJvclxuICAgICAgKTtcblxuICAgICAgbmV3IE5vdGljZShcbiAgICAgICAgXCJDb3VsZCBub3QgZG93bmxvYWQgaW1hZ2VcIlxuICAgICAgKTtcblxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cblxuICBwcml2YXRlIGFzeW5jIGlkZWFGcm9tRmlsZShcbiAgICBmaWxlOiBURmlsZVxuICApOiBQcm9taXNlPENhcHR1cmVJZGVhPiB7XG4gICAgY29uc3QgbWFya2Rvd24gPVxuICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHRcbiAgICAgICAgLmNhY2hlZFJlYWQoZmlsZSk7XG5cbiAgICAvKlxuICAgICBFbXB0eS90aXRsZS1vbmx5IG5vdGU6XG4gICAgIGZpbGVuYW1lIGJlY29tZXMgdGhlIElkZWEuXG5cbiAgICAgT3RoZXJ3aXNlIHByZXNlcnZlIHRoZSBub3RlIGJvZHkgZXhhY3RseS5cbiAgICAqL1xuICAgIGNvbnN0IGNvbnRlbnQgPVxuICAgICAgbWFya2Rvd24udHJpbSgpLmxlbmd0aCA+IDBcbiAgICAgICAgPyBtYXJrZG93blxuICAgICAgICA6IGZpbGUuYmFzZW5hbWU7XG5cbiAgICByZXR1cm4ge1xuICAgICAga2luZDpcbiAgICAgICAgXCJub3RlXCIsXG5cbiAgICAgIGNvbnRlbnQsXG5cbiAgICAgIHNvdXJjZVRpdGxlOlxuICAgICAgICBmaWxlLmJhc2VuYW1lLFxuXG4gICAgICBzb3VyY2VQYXRoOlxuICAgICAgICBmaWxlLnBhdGhcbiAgICB9O1xuICB9XG5cblxuICBwcml2YXRlIHNlbmRQYXlsb2FkKFxuICAgIGlkZWFzOiBDYXB0dXJlSWRlYVtdXG4gICk6IHZvaWQge1xuICAgIGlmIChcbiAgICAgIGlkZWFzLmxlbmd0aCA9PT0gMFxuICAgICkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChcbiAgICAgICFleGlzdHNTeW5jKFxuICAgICAgICBERUJVR19JTlpSVF9BUFBcbiAgICAgIClcbiAgICApIHtcbiAgICAgIG5ldyBOb3RpY2UoXG4gICAgICAgIFwiSU5aUlQgdGVzdCBidWlsZCBpcyBub3QgYXZhaWxhYmxlXCJcbiAgICAgICk7XG5cbiAgICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAgIFwiW0lOWlJUIENvbXBhbmlvbl0gTWlzc2luZyBhcHA6XCIsXG4gICAgICAgIERFQlVHX0lOWlJUX0FQUFxuICAgICAgKTtcblxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBkaXJlY3RvcnkgPVxuICAgICAgICBqb2luKFxuICAgICAgICAgIHRtcGRpcigpLFxuICAgICAgICAgIFwiaW56cnQtY29tcGFuaW9uXCJcbiAgICAgICAgKTtcblxuICAgICAgbWtkaXJTeW5jKFxuICAgICAgICBkaXJlY3RvcnksXG4gICAgICAgIHtcbiAgICAgICAgICByZWN1cnNpdmU6XG4gICAgICAgICAgICB0cnVlXG4gICAgICAgIH1cbiAgICAgICk7XG5cbiAgICAgIGNvbnN0IGNhcHR1cmVQYXRoID1cbiAgICAgICAgam9pbihcbiAgICAgICAgICBkaXJlY3RvcnksXG4gICAgICAgICAgYCR7cmFuZG9tVVVJRCgpfS5pbnpydGNhcHR1cmVgXG4gICAgICAgICk7XG5cbiAgICAgIGNvbnN0IGVudmVsb3BlOlxuICAgICAgICBDYXB0dXJlRW52ZWxvcGUgPVxuICAgICAge1xuICAgICAgICB2ZXJzaW9uOlxuICAgICAgICAgIDEsXG5cbiAgICAgICAgaWRlYXNcbiAgICAgIH07XG5cbiAgICAgIHdyaXRlRmlsZVN5bmMoXG4gICAgICAgIGNhcHR1cmVQYXRoLFxuICAgICAgICBKU09OLnN0cmluZ2lmeShcbiAgICAgICAgICBlbnZlbG9wZSxcbiAgICAgICAgICBudWxsLFxuICAgICAgICAgIDJcbiAgICAgICAgKSxcbiAgICAgICAgXCJ1dGY4XCJcbiAgICAgICk7XG5cbiAgICAgIC8qXG4gICAgICAgVGhlIGZpbGUgaXMgdGhlIHBheWxvYWQuXG5cbiAgICAgICBgb3BlbiAtYWAgbGF1bmNoZXMgSU5aUlQgd2hlbiBjbG9zZWQgb3JcbiAgICAgICBhY3RpdmF0ZXMgdGhlIGFscmVhZHktcnVubmluZyB0ZXN0IGJ1aWxkXG4gICAgICAgYW5kIGRlbGl2ZXJzIHRoZSBjYXB0dXJlIGZpbGUgdG8gaXQuXG4gICAgICAqL1xuICAgICAgZXhlY0ZpbGUoXG4gICAgICAgIFwiL3Vzci9iaW4vb3BlblwiLFxuICAgICAgICBbXG4gICAgICAgICAgXCItYVwiLFxuICAgICAgICAgIERFQlVHX0lOWlJUX0FQUCxcbiAgICAgICAgICBjYXB0dXJlUGF0aFxuICAgICAgICBdLFxuICAgICAgICAoXG4gICAgICAgICAgZXJyb3JcbiAgICAgICAgKSA9PiB7XG4gICAgICAgICAgaWYgKFxuICAgICAgICAgICAgZXJyb3JcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAgICAgICAgIFwiW0lOWlJUIENvbXBhbmlvbl0gb3BlbiBmYWlsZWQ6XCIsXG4gICAgICAgICAgICAgIGVycm9yXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICBuZXcgTm90aWNlKFxuICAgICAgICAgICAgICBcIkNvdWxkIG5vdCBvcGVuIElOWlJUXCJcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBuZXcgTm90aWNlKFxuICAgICAgICAgICAgaWRlYXMubGVuZ3RoID09PSAxXG4gICAgICAgICAgICAgID8gXCJTZW50IHRvIElOWlJUXCJcbiAgICAgICAgICAgICAgOiBgU2VudCAke2lkZWFzLmxlbmd0aH0gSWRlYXMgdG8gSU5aUlRgXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgKTtcbiAgICB9IGNhdGNoIChcbiAgICAgIGVycm9yXG4gICAgKSB7XG4gICAgICBjb25zb2xlLmVycm9yKFxuICAgICAgICBcIltJTlpSVCBDb21wYW5pb25dIHNlbmQgZmFpbGVkOlwiLFxuICAgICAgICBlcnJvclxuICAgICAgKTtcblxuICAgICAgbmV3IE5vdGljZShcbiAgICAgICAgXCJDb3VsZCBub3Qgc2VuZCB0byBJTlpSVFwiXG4gICAgICApO1xuICAgIH1cbiAgfVxufVxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEs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
