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
var DRAFTAVA_WEBSITE = "https://offensivecaffeine.com/draftava/";
var DraftavaCompanionPlugin = class extends import_obsidian.Plugin {
  floatingActionEl = null;
  async onload() {
    this.registerSingleFileMenu();
    this.registerMultiFileMenu();
    this.registerFloatingCaptureActions();
    this.addCommand({
      id: "open-draftava-website",
      name: "Get Draftava",
      callback: () => {
        window.open(
          DRAFTAVA_WEBSITE,
          "_blank",
          "noopener,noreferrer"
        );
      }
    });
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
    const browserSelection = window.getSelection();
    const domSelection = browserSelection?.toString() ?? "";
    const selectionTouchesTitle = [
      browserSelection?.anchorNode,
      browserSelection?.focusNode
    ].some((node) => {
      const element = node instanceof Element ? node : node?.parentElement;
      return Boolean(
        element?.closest(
          ".inline-title, .view-header-title"
        )
      );
    });
    const selectedText = selectionTouchesTitle && domSelection.trim().length > 0 ? domSelection : editorSelection.trim().length > 0 ? editorSelection : domSelection;
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
      const activeNote = this.app.workspace.getActiveFile();
      if (activeNote && activeNote.extension.toLowerCase() === "md") {
        idea.sourceTitle = activeNote.basename;
        idea.sourcePath = activeNote.path;
      }
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
  showDraftavaUnavailableNotice() {
    const notice = new import_obsidian.Notice("", 12e3);
    notice.messageEl.textContent = "Draftava app is not available. ";
    const link = document.createElement("a");
    link.textContent = "Get Draftava";
    link.href = DRAFTAVA_WEBSITE;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    notice.messageEl.appendChild(link);
  }
  dispatchCaptureFile(capturePath, ideaCount) {
    const script = [
      'ObjC.import("AppKit");',
      "var apps = $.NSWorkspace.sharedWorkspace.runningApplications;",
      "var matches = [];",
      "for (var i = 0; i < apps.count; i++) {",
      "  var app = apps.objectAtIndex(i);",
      "  var identifier = app.bundleIdentifier;",
      '  if (identifier && (ObjC.unwrap(identifier) === "com.local.inzrt" || ObjC.unwrap(identifier) === "com.local.inzrt.filefirstproductionqa")) {',
      "    var url = app.bundleURL;",
      "    if (url) matches.push(ObjC.unwrap(url.path));",
      "  }",
      "}",
      "matches.find(function(path) {",
      '  return path !== "/Applications/Draftava.app";',
      '}) || matches[0] || "";'
    ].join("\n");
    (0, import_node_child_process.execFile)(
      "/usr/bin/osascript",
      ["-l", "JavaScript", "-e", script],
      { timeout: 8e3 },
      (probeError, stdout) => {
        if (probeError) {
          console.error(
            "[Draftava Companion] Running-app lookup failed:",
            probeError
          );
          new import_obsidian.Notice("Could not locate running Draftava");
          return;
        }
        const runningPath = stdout.trim();
        const appPath = runningPath || DEBUG_DRAFTAVA_APP;
        if (!appPath.endsWith(".app") || !(0, import_node_fs.existsSync)(appPath)) {
          this.showDraftavaUnavailableNotice();
          return;
        }
        (0, import_node_child_process.execFile)(
          "/usr/bin/open",
          ["-a", appPath, capturePath],
          (error) => {
            if (error) {
              console.error(
                "[Draftava Companion] open failed:",
                error
              );
              new import_obsidian.Notice("Could not open Draftava");
              return;
            }
            new import_obsidian.Notice(
              ideaCount === 1 ? "Sent to Draftava" : `Sent ${ideaCount} Ideas to Draftava`
            );
          }
        );
      }
    );
  }
  sendPayload(ideas) {
    if (ideas.length === 0) {
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
      const vaultName = this.app.vault.getName();
      const outgoingIdeas = ideas.map((idea) => {
        const file = idea.sourcePath ? this.app.vault.getAbstractFileByPath(
          idea.sourcePath
        ) : null;
        if (!(file instanceof import_obsidian.TFile)) {
          return idea;
        }
        return {
          ...idea,
          sourceUrl: "obsidian://open?vault=" + encodeURIComponent(vaultName) + "&file=" + encodeURIComponent(file.path)
        };
      });
      const envelope = {
        version: 1,
        ideas: outgoingIdeas
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
      this.dispatchCaptureFile(
        capturePath,
        ideas.length
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB7XG4gIE1lbnUsXG4gIE1hcmtkb3duVmlldyxcbiAgTm90aWNlLFxuICBQbHVnaW4sXG4gIHJlcXVlc3RVcmwsXG4gIHNldEljb24sXG4gIFRBYnN0cmFjdEZpbGUsXG4gIFRGaWxlXG59IGZyb20gXCJvYnNpZGlhblwiO1xuXG5pbXBvcnQge1xuICBCdWZmZXJcbn0gZnJvbSBcIm5vZGU6YnVmZmVyXCI7XG5cbmltcG9ydCB7XG4gIGV4ZWNGaWxlXG59IGZyb20gXCJub2RlOmNoaWxkX3Byb2Nlc3NcIjtcblxuaW1wb3J0IHtcbiAgcmFuZG9tVVVJRFxufSBmcm9tIFwibm9kZTpjcnlwdG9cIjtcblxuaW1wb3J0IHtcbiAgZXhpc3RzU3luYyxcbiAgbWtkaXJTeW5jLFxuICB3cml0ZUZpbGVTeW5jXG59IGZyb20gXCJub2RlOmZzXCI7XG5cbmltcG9ydCB7XG4gIHRtcGRpclxufSBmcm9tIFwibm9kZTpvc1wiO1xuXG5pbXBvcnQge1xuICBqb2luXG59IGZyb20gXCJub2RlOnBhdGhcIjtcblxuXG5jb25zdCBERUJVR19EUkFGVEFWQV9BUFAgPVxuICBcIi9BcHBsaWNhdGlvbnMvRHJhZnRhdmEuYXBwXCI7XG5cbmNvbnN0IERSQUZUQVZBX1dFQlNJVEUgPVxuICBcImh0dHBzOi8vb2ZmZW5zaXZlY2FmZmVpbmUuY29tL2RyYWZ0YXZhL1wiO1xuXG5cbmludGVyZmFjZSBDYXB0dXJlSW1hZ2Uge1xuICBkYXRhQmFzZTY0OiBzdHJpbmc7XG4gIG1pbWVUeXBlPzogc3RyaW5nO1xuICBvcmlnaW5hbEZpbGVOYW1lPzogc3RyaW5nO1xufVxuXG5cbmludGVyZmFjZSBDYXB0dXJlSWRlYSB7XG4gIGtpbmQ6XG4gICAgfCBcInNlbGVjdGlvblwiXG4gICAgfCBcIm5vdGVcIlxuICAgIHwgXCJpbWFnZVwiO1xuXG4gIGNvbnRlbnQ/OiBzdHJpbmc7XG4gIGltYWdlPzogQ2FwdHVyZUltYWdlO1xuICBzb3VyY2VUaXRsZT86IHN0cmluZztcbiAgc291cmNlUGF0aD86IHN0cmluZztcbiAgc291cmNlVXJsPzogc3RyaW5nO1xufVxuXG5cbmludGVyZmFjZSBDYXB0dXJlRW52ZWxvcGUge1xuICB2ZXJzaW9uOiAxO1xuICBpZGVhczogQ2FwdHVyZUlkZWFbXTtcbn1cblxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBEcmFmdGF2YUNvbXBhbmlvblBsdWdpblxuICBleHRlbmRzIFBsdWdpblxue1xuICBwcml2YXRlIGZsb2F0aW5nQWN0aW9uRWw6XG4gICAgSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcblxuICBhc3luYyBvbmxvYWQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy5yZWdpc3RlclNpbmdsZUZpbGVNZW51KCk7XG4gICAgdGhpcy5yZWdpc3Rlck11bHRpRmlsZU1lbnUoKTtcbiAgICB0aGlzLnJlZ2lzdGVyRmxvYXRpbmdDYXB0dXJlQWN0aW9ucygpO1xuXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiBcIm9wZW4tZHJhZnRhdmEtd2Vic2l0ZVwiLFxuICAgICAgbmFtZTogXCJHZXQgRHJhZnRhdmFcIixcbiAgICAgIGNhbGxiYWNrOiAoKSA9PiB7XG4gICAgICAgIHdpbmRvdy5vcGVuKFxuICAgICAgICAgIERSQUZUQVZBX1dFQlNJVEUsXG4gICAgICAgICAgXCJfYmxhbmtcIixcbiAgICAgICAgICBcIm5vb3BlbmVyLG5vcmVmZXJyZXJcIlxuICAgICAgICApO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgbmV3IE5vdGljZShcbiAgICAgIFwiRHJhZnRhdmEgQ29tcGFuaW9uIGxvYWRlZFwiXG4gICAgKTtcbiAgfVxuXG5cbiAgLypcbiAgIE9ic2lkaWFuIGN1cnJlbnRseSBlbWl0cyBlZGl0b3ItbWVudSBhbmRcbiAgIGZpbGVzLW1lbnUgYXQgcnVudGltZS5cblxuICAgZmlsZXMtbWVudSBpcyBub3QgY2xlYW5seSByZXByZXNlbnRlZCBpbiBhbGxcbiAgIHB1Ymxpc2hlZCBUeXBlU2NyaXB0IGRlY2xhcmF0aW9uIHZlcnNpb25zLCBzb1xuICAgdGhpcyBwcm90b3R5cGUgaW50ZW50aW9uYWxseSBrZWVwcyB0aGUgcnVudGltZVxuICAgZXZlbnQgYnJpZGdlIHVudHlwZWQgcmF0aGVyIHRoYW4gaW52ZW50aW5nXG4gICBjb25mbGljdGluZyBvdmVybG9hZHMuXG4gICovXG4gIHByaXZhdGUgcnVudGltZVdvcmtzcGFjZSgpOiBhbnkge1xuICAgIHJldHVybiB0aGlzLmFwcC53b3Jrc3BhY2U7XG4gIH1cblxuXG4gIHByaXZhdGUgcmVnaXN0ZXJTaW5nbGVGaWxlTWVudSgpOlxuICAgIHZvaWRcbiAge1xuICAgIHRoaXMucmVnaXN0ZXJFdmVudChcbiAgICAgIHRoaXMuYXBwLndvcmtzcGFjZS5vbihcbiAgICAgICAgXCJmaWxlLW1lbnVcIixcbiAgICAgICAgKFxuICAgICAgICAgIG1lbnU6IE1lbnUsXG4gICAgICAgICAgZmlsZTogVEFic3RyYWN0RmlsZVxuICAgICAgICApID0+IHtcbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAhKGZpbGUgaW5zdGFuY2VvZiBURmlsZSlcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBjb25zdCBpc01hcmtkb3duID1cbiAgICAgICAgICAgIGZpbGUuZXh0ZW5zaW9uXG4gICAgICAgICAgICAgIC50b0xvd2VyQ2FzZSgpXG4gICAgICAgICAgICAgID09PSBcIm1kXCI7XG5cbiAgICAgICAgICBjb25zdCBpc0ltYWdlID1cbiAgICAgICAgICAgIHRoaXMuaXNTdXBwb3J0ZWRJbWFnZUZpbGUoXG4gICAgICAgICAgICAgIGZpbGVcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAhaXNNYXJrZG93blxuICAgICAgICAgICAgJiZcbiAgICAgICAgICAgICFpc0ltYWdlXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbWVudS5hZGRJdGVtKFxuICAgICAgICAgICAgKGl0ZW0pID0+IHtcbiAgICAgICAgICAgICAgaXRlbVxuICAgICAgICAgICAgICAgIC5zZXRUaXRsZShcbiAgICAgICAgICAgICAgICAgIFwiU2VuZCB0byBEcmFmdGF2YVwiXG4gICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgIC5zZXRJY29uKFwic2VuZFwiKVxuICAgICAgICAgICAgICAgIC5vbkNsaWNrKFxuICAgICAgICAgICAgICAgICAgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpZGVhID1cbiAgICAgICAgICAgICAgICAgICAgICBpc0ltYWdlXG4gICAgICAgICAgICAgICAgICAgICAgICA/IGF3YWl0IHRoaXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAuaWRlYUZyb21JbWFnZUZpbGUoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgICAgICAgICAgOiBhd2FpdCB0aGlzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLmlkZWFGcm9tRmlsZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgICAgICAgICBpZGVhXG4gICAgICAgICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2VuZFBheWxvYWQoW1xuICAgICAgICAgICAgICAgICAgICAgICAgaWRlYVxuICAgICAgICAgICAgICAgICAgICAgIF0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICApXG4gICAgKTtcbiAgfVxuXG5cbiAgcHJpdmF0ZSByZWdpc3Rlck11bHRpRmlsZU1lbnUoKTpcbiAgICB2b2lkXG4gIHtcbiAgICBjb25zdCB3b3Jrc3BhY2U6IGFueSA9XG4gICAgICB0aGlzLnJ1bnRpbWVXb3Jrc3BhY2UoKTtcblxuICAgIHRoaXMucmVnaXN0ZXJFdmVudChcbiAgICAgIHdvcmtzcGFjZS5vbihcbiAgICAgICAgXCJmaWxlcy1tZW51XCIsXG4gICAgICAgIChcbiAgICAgICAgICBtZW51OiBNZW51LFxuICAgICAgICAgIGZpbGVzOiBUQWJzdHJhY3RGaWxlW11cbiAgICAgICAgKSA9PiB7XG4gICAgICAgICAgY29uc3Qgbm90ZXMgPVxuICAgICAgICAgICAgZmlsZXMuZmlsdGVyKFxuICAgICAgICAgICAgICAoXG4gICAgICAgICAgICAgICAgZmlsZVxuICAgICAgICAgICAgICApOiBmaWxlIGlzIFRGaWxlID0+XG4gICAgICAgICAgICAgICAgZmlsZSBpbnN0YW5jZW9mIFRGaWxlXG4gICAgICAgICAgICAgICAgJiZcbiAgICAgICAgICAgICAgICBmaWxlLmV4dGVuc2lvblxuICAgICAgICAgICAgICAgICAgLnRvTG93ZXJDYXNlKClcbiAgICAgICAgICAgICAgICAgID09PSBcIm1kXCJcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICBub3Rlcy5sZW5ndGggPCAyXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbWVudS5hZGRJdGVtKFxuICAgICAgICAgICAgKGl0ZW06IGFueSkgPT4ge1xuICAgICAgICAgICAgICBpdGVtXG4gICAgICAgICAgICAgICAgLnNldFRpdGxlKFxuICAgICAgICAgICAgICAgICAgXCJTZW5kIHRvIERyYWZ0YXZhXCJcbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgLnNldEljb24oXCJzZW5kXCIpXG4gICAgICAgICAgICAgICAgLm9uQ2xpY2soXG4gICAgICAgICAgICAgICAgICBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlkZWFzID1cbiAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBQcm9taXNlLmFsbChcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vdGVzLm1hcChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgKGZpbGUpID0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pZGVhRnJvbUZpbGUoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZW5kUGF5bG9hZChcbiAgICAgICAgICAgICAgICAgICAgICBpZGVhc1xuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgKVxuICAgICk7XG4gIH1cblxuXG4gIHByaXZhdGUgcmVnaXN0ZXJGbG9hdGluZ0NhcHR1cmVBY3Rpb25zKCk6XG4gICAgdm9pZFxuICB7XG4gICAgLypcbiAgICAgVGV4dCBzZWxlY3Rpb24uXG5cbiAgICAgV2UgdXNlIHRoZSBPYnNpZGlhbiBlZGl0b3IgZm9yIHRoZSBhY3R1YWwgdGV4dFxuICAgICB3aGVuZXZlciBwb3NzaWJsZSwgYW5kIERPTSBnZW9tZXRyeSBvbmx5IHRvXG4gICAgIHBvc2l0aW9uIHRoZSB2aXN1YWwgY2Fwc3VsZS5cbiAgICAgKi9cbiAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoXG4gICAgICBkb2N1bWVudCxcbiAgICAgIFwibW91c2V1cFwiLFxuICAgICAgKCkgPT4ge1xuICAgICAgICB3aW5kb3cuc2V0VGltZW91dChcbiAgICAgICAgICAoKSA9PiB0aGlzLnNob3dUZXh0U2VsZWN0aW9uQWN0aW9uKCksXG4gICAgICAgICAgMFxuICAgICAgICApO1xuICAgICAgfVxuICAgICk7XG5cbiAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoXG4gICAgICBkb2N1bWVudCxcbiAgICAgIFwia2V5dXBcIixcbiAgICAgIChldmVudDogS2V5Ym9hcmRFdmVudCkgPT4ge1xuICAgICAgICBpZiAoZXZlbnQua2V5ID09PSBcIkVzY2FwZVwiKSB7XG4gICAgICAgICAgdGhpcy5oaWRlRmxvYXRpbmdBY3Rpb24oKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoXG4gICAgICAgICAgZXZlbnQuc2hpZnRLZXlcbiAgICAgICAgICB8fCBldmVudC5rZXkuc3RhcnRzV2l0aChcIkFycm93XCIpXG4gICAgICAgICkge1xuICAgICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KFxuICAgICAgICAgICAgKCkgPT4gdGhpcy5zaG93VGV4dFNlbGVjdGlvbkFjdGlvbigpLFxuICAgICAgICAgICAgMFxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICApO1xuXG4gICAgLypcbiAgICAgSW1hZ2UgY2xpY2suXG5cbiAgICAgRG8gbm90IHByZXZlbnREZWZhdWx0IG9yIHN0b3BQcm9wYWdhdGlvbi5cbiAgICAgT2JzaWRpYW4gcmVtYWlucyBmdWxseSByZXNwb25zaWJsZSBmb3IgbmF0aXZlXG4gICAgIGltYWdlIHNlbGVjdGlvbiwgcmVzaXplIGhhbmRsZXMgYW5kIGNvbnRyb2xzLlxuICAgICAqL1xuICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChcbiAgICAgIGRvY3VtZW50LFxuICAgICAgXCJjbGlja1wiLFxuICAgICAgKGV2ZW50OiBNb3VzZUV2ZW50KSA9PiB7XG4gICAgICAgIGNvbnN0IHRhcmdldCA9XG4gICAgICAgICAgZXZlbnQudGFyZ2V0IGluc3RhbmNlb2YgRWxlbWVudFxuICAgICAgICAgICAgPyBldmVudC50YXJnZXRcbiAgICAgICAgICAgIDogbnVsbDtcblxuICAgICAgICBpZiAoIXRhcmdldCkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChcbiAgICAgICAgICB0aGlzLmZsb2F0aW5nQWN0aW9uRWxcbiAgICAgICAgICAmJiB0aGlzLmZsb2F0aW5nQWN0aW9uRWwuY29udGFpbnModGFyZ2V0KVxuICAgICAgICApIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBpbWFnZSA9XG4gICAgICAgICAgdGhpcy5maW5kQ2xpY2tlZEltYWdlKHRhcmdldCk7XG5cbiAgICAgICAgaWYgKCFpbWFnZSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChcbiAgICAgICAgICAhaW1hZ2UuY2xvc2VzdChcbiAgICAgICAgICAgIFwiLm1hcmtkb3duLXNvdXJjZS12aWV3LCAubWFya2Rvd24tcHJldmlldy12aWV3XCJcbiAgICAgICAgICApXG4gICAgICAgICkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHggPSBldmVudC5jbGllbnRYO1xuICAgICAgICBjb25zdCB5ID0gZXZlbnQuY2xpZW50WTtcblxuICAgICAgICB3aW5kb3cuc2V0VGltZW91dChcbiAgICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNob3dJbWFnZUNhcHR1cmVBY3Rpb24oXG4gICAgICAgICAgICAgIGltYWdlLFxuICAgICAgICAgICAgICB4LFxuICAgICAgICAgICAgICB5XG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgMFxuICAgICAgICApO1xuICAgICAgfVxuICAgICk7XG5cbiAgICAvKlxuICAgICBBbnkgbmV3IGludGVyYWN0aW9uIG91dHNpZGUgdGhlIGNhcHN1bGUgZGlzbWlzc2VzXG4gICAgIHRoZSBwcmV2aW91cyBhY3Rpb24uXG4gICAgICovXG4gICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KFxuICAgICAgZG9jdW1lbnQsXG4gICAgICBcInBvaW50ZXJkb3duXCIsXG4gICAgICAoZXZlbnQ6IFBvaW50ZXJFdmVudCkgPT4ge1xuICAgICAgICBjb25zdCB0YXJnZXQgPVxuICAgICAgICAgIGV2ZW50LnRhcmdldCBpbnN0YW5jZW9mIE5vZGVcbiAgICAgICAgICAgID8gZXZlbnQudGFyZ2V0XG4gICAgICAgICAgICA6IG51bGw7XG5cbiAgICAgICAgaWYgKFxuICAgICAgICAgIHRhcmdldFxuICAgICAgICAgICYmIHRoaXMuZmxvYXRpbmdBY3Rpb25FbFxuICAgICAgICAgICYmIHRoaXMuZmxvYXRpbmdBY3Rpb25FbC5jb250YWlucyh0YXJnZXQpXG4gICAgICAgICkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuaGlkZUZsb2F0aW5nQWN0aW9uKCk7XG4gICAgICB9LFxuICAgICAgdHJ1ZVxuICAgICk7XG5cbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgIFwic2Nyb2xsXCIsXG4gICAgICB0aGlzLmhpZGVGbG9hdGluZ0FjdGlvbkJvdW5kLFxuICAgICAgdHJ1ZVxuICAgICk7XG5cbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgIFwicmVzaXplXCIsXG4gICAgICB0aGlzLmhpZGVGbG9hdGluZ0FjdGlvbkJvdW5kXG4gICAgKTtcblxuICAgIHRoaXMucmVnaXN0ZXIoXG4gICAgICAoKSA9PiB7XG4gICAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKFxuICAgICAgICAgIFwic2Nyb2xsXCIsXG4gICAgICAgICAgdGhpcy5oaWRlRmxvYXRpbmdBY3Rpb25Cb3VuZCxcbiAgICAgICAgICB0cnVlXG4gICAgICAgICk7XG5cbiAgICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoXG4gICAgICAgICAgXCJyZXNpemVcIixcbiAgICAgICAgICB0aGlzLmhpZGVGbG9hdGluZ0FjdGlvbkJvdW5kXG4gICAgICAgICk7XG5cbiAgICAgICAgdGhpcy5oaWRlRmxvYXRpbmdBY3Rpb24oKTtcbiAgICAgIH1cbiAgICApO1xuICB9XG5cblxuICBwcml2YXRlIGhpZGVGbG9hdGluZ0FjdGlvbkJvdW5kID1cbiAgICAoKTogdm9pZCA9PiB7XG4gICAgICB0aGlzLmhpZGVGbG9hdGluZ0FjdGlvbigpO1xuICAgIH07XG5cblxuICBwcml2YXRlIGZpbmRDbGlja2VkSW1hZ2UoXG4gICAgc3RhcnQ6IEVsZW1lbnRcbiAgKTogSFRNTEltYWdlRWxlbWVudCB8IG51bGxcbiAge1xuICAgIGxldCBlbGVtZW50OiBFbGVtZW50IHwgbnVsbCA9XG4gICAgICBzdGFydDtcblxuICAgIHdoaWxlIChlbGVtZW50KSB7XG4gICAgICBpZiAoXG4gICAgICAgIGVsZW1lbnQgaW5zdGFuY2VvZiBIVE1MSW1hZ2VFbGVtZW50XG4gICAgICApIHtcbiAgICAgICAgcmV0dXJuIGVsZW1lbnQ7XG4gICAgICB9XG5cbiAgICAgIGVsZW1lbnQgPVxuICAgICAgICBlbGVtZW50LnBhcmVudEVsZW1lbnQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuXG4gIHByaXZhdGUgZ2V0U2VsZWN0aW9uQW5jaG9yUmVjdChcbiAgICB2aWV3OiBNYXJrZG93blZpZXcgfCBudWxsXG4gICk6IERPTVJlY3QgfCBudWxsXG4gIHtcbiAgICBjb25zdCBzZWxlY3Rpb24gPVxuICAgICAgd2luZG93LmdldFNlbGVjdGlvbigpO1xuXG4gICAgaWYgKFxuICAgICAgc2VsZWN0aW9uXG4gICAgICAmJiBzZWxlY3Rpb24ucmFuZ2VDb3VudCA+IDBcbiAgICAgICYmICFzZWxlY3Rpb24uaXNDb2xsYXBzZWRcbiAgICApIHtcbiAgICAgIGNvbnN0IHJhbmdlID1cbiAgICAgICAgc2VsZWN0aW9uLmdldFJhbmdlQXQoMCk7XG5cbiAgICAgIGNvbnN0IGNsaWVudFJlY3RzID1cbiAgICAgICAgQXJyYXkuZnJvbShcbiAgICAgICAgICByYW5nZS5nZXRDbGllbnRSZWN0cygpXG4gICAgICAgIClcbiAgICAgICAgLmZpbHRlcihcbiAgICAgICAgICAocmVjdCkgPT5cbiAgICAgICAgICAgIHJlY3Qud2lkdGggPiAwXG4gICAgICAgICAgICAmJiByZWN0LmhlaWdodCA+IDBcbiAgICAgICAgKTtcblxuICAgICAgaWYgKGNsaWVudFJlY3RzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgcmV0dXJuIGNsaWVudFJlY3RzW1xuICAgICAgICAgIGNsaWVudFJlY3RzLmxlbmd0aCAtIDFcbiAgICAgICAgXTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgYm91bmRpbmdSZWN0ID1cbiAgICAgICAgcmFuZ2UuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICAgIGlmIChcbiAgICAgICAgYm91bmRpbmdSZWN0LndpZHRoID4gMFxuICAgICAgICB8fCBib3VuZGluZ1JlY3QuaGVpZ2h0ID4gMFxuICAgICAgKSB7XG4gICAgICAgIHJldHVybiBib3VuZGluZ1JlY3Q7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLypcbiAgICAgTGl2ZSBQcmV2aWV3IGZhbGxiYWNrLlxuXG4gICAgIENvZGVNaXJyb3IgcmVuZGVycyBzZWxlY3RlZCByZWdpb25zIGFzXG4gICAgIGNtLXNlbGVjdGlvbkJhY2tncm91bmQgZWxlbWVudHMuXG4gICAgICovXG4gICAgaWYgKHZpZXcpIHtcbiAgICAgIGNvbnN0IHNlbGVjdGlvblJlY3RzID1cbiAgICAgICAgQXJyYXkuZnJvbShcbiAgICAgICAgICB2aWV3LmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEVsZW1lbnQ+KFxuICAgICAgICAgICAgXCIuY20tc2VsZWN0aW9uQmFja2dyb3VuZFwiXG4gICAgICAgICAgKVxuICAgICAgICApXG4gICAgICAgIC5tYXAoXG4gICAgICAgICAgKGVsZW1lbnQpID0+XG4gICAgICAgICAgICBlbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpXG4gICAgICAgIClcbiAgICAgICAgLmZpbHRlcihcbiAgICAgICAgICAocmVjdCkgPT5cbiAgICAgICAgICAgIHJlY3Qud2lkdGggPiAwXG4gICAgICAgICAgICAmJiByZWN0LmhlaWdodCA+IDBcbiAgICAgICAgKTtcblxuICAgICAgaWYgKHNlbGVjdGlvblJlY3RzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgcmV0dXJuIHNlbGVjdGlvblJlY3RzW1xuICAgICAgICAgIHNlbGVjdGlvblJlY3RzLmxlbmd0aCAtIDFcbiAgICAgICAgXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG5cbiAgcHJpdmF0ZSBzaG93VGV4dFNlbGVjdGlvbkFjdGlvbigpOlxuICAgIHZvaWRcbiAge1xuICAgIGNvbnN0IHZpZXcgPVxuICAgICAgdGhpcy5hcHAud29ya3NwYWNlXG4gICAgICAgIC5nZXRBY3RpdmVWaWV3T2ZUeXBlKFxuICAgICAgICAgIE1hcmtkb3duVmlld1xuICAgICAgICApO1xuXG4gICAgY29uc3QgZWRpdG9yU2VsZWN0aW9uID1cbiAgICAgIHZpZXc/LmVkaXRvci5nZXRTZWxlY3Rpb24oKVxuICAgICAgPz8gXCJcIjtcblxuICAgIGNvbnN0IGJyb3dzZXJTZWxlY3Rpb24gPVxuICAgICAgd2luZG93LmdldFNlbGVjdGlvbigpO1xuXG4gICAgY29uc3QgZG9tU2VsZWN0aW9uID1cbiAgICAgIGJyb3dzZXJTZWxlY3Rpb24/LnRvU3RyaW5nKClcbiAgICAgID8/IFwiXCI7XG5cbiAgICBjb25zdCBzZWxlY3Rpb25Ub3VjaGVzVGl0bGUgPVxuICAgICAgW1xuICAgICAgICBicm93c2VyU2VsZWN0aW9uPy5hbmNob3JOb2RlLFxuICAgICAgICBicm93c2VyU2VsZWN0aW9uPy5mb2N1c05vZGVcbiAgICAgIF0uc29tZSgobm9kZSkgPT4ge1xuICAgICAgICBjb25zdCBlbGVtZW50ID1cbiAgICAgICAgICBub2RlIGluc3RhbmNlb2YgRWxlbWVudFxuICAgICAgICAgICAgPyBub2RlXG4gICAgICAgICAgICA6IG5vZGU/LnBhcmVudEVsZW1lbnQ7XG5cbiAgICAgICAgcmV0dXJuIEJvb2xlYW4oXG4gICAgICAgICAgZWxlbWVudD8uY2xvc2VzdChcbiAgICAgICAgICAgIFwiLmlubGluZS10aXRsZSwgLnZpZXctaGVhZGVyLXRpdGxlXCJcbiAgICAgICAgICApXG4gICAgICAgICk7XG4gICAgICB9KTtcblxuICAgIGNvbnN0IHNlbGVjdGVkVGV4dCA9XG4gICAgICBzZWxlY3Rpb25Ub3VjaGVzVGl0bGVcbiAgICAgICAgJiYgZG9tU2VsZWN0aW9uLnRyaW0oKS5sZW5ndGggPiAwXG4gICAgICAgID8gZG9tU2VsZWN0aW9uXG4gICAgICAgIDogZWRpdG9yU2VsZWN0aW9uLnRyaW0oKS5sZW5ndGggPiAwXG4gICAgICAgICAgPyBlZGl0b3JTZWxlY3Rpb25cbiAgICAgICAgICA6IGRvbVNlbGVjdGlvbjtcblxuICAgIGlmIChcbiAgICAgIHNlbGVjdGVkVGV4dC50cmltKCkubGVuZ3RoID09PSAwXG4gICAgKSB7XG4gICAgICB0aGlzLmhpZGVGbG9hdGluZ0FjdGlvbigpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGFuY2hvclJlY3QgPVxuICAgICAgdGhpcy5nZXRTZWxlY3Rpb25BbmNob3JSZWN0KFxuICAgICAgICB2aWV3XG4gICAgICApO1xuXG4gICAgaWYgKCFhbmNob3JSZWN0KSB7XG4gICAgICB0aGlzLmhpZGVGbG9hdGluZ0FjdGlvbigpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGFjdGl2ZUZpbGUgPVxuICAgICAgdmlldz8uZmlsZVxuICAgICAgPz8gdGhpcy5hcHAud29ya3NwYWNlLmdldEFjdGl2ZUZpbGUoKTtcblxuICAgIC8qXG4gICAgIERyYWZ0YXZhLXN0eWxlIHBvc2l0aW9uOlxuICAgICBhbGlnbmVkIHRvIHRoZSBlbmQgb2YgdGhlIHNlbGVjdGVkIHRleHQgYW5kXG4gICAgIHNsaWdodGx5IGFib3ZlIGl0IHdoZW4gcm9vbSBpcyBhdmFpbGFibGUuXG4gICAgICovXG4gICAgY29uc3QgcmVxdWVzdGVkWCA9XG4gICAgICBhbmNob3JSZWN0LnJpZ2h0IC0gNjg7XG5cbiAgICBjb25zdCByZXF1ZXN0ZWRZID1cbiAgICAgIGFuY2hvclJlY3QudG9wID49IDM4XG4gICAgICAgID8gYW5jaG9yUmVjdC50b3AgLSAzNlxuICAgICAgICA6IGFuY2hvclJlY3QuYm90dG9tICsgNjtcblxuICAgIHRoaXMuc2hvd0Zsb2F0aW5nQWN0aW9uKFxuICAgICAgcmVxdWVzdGVkWCxcbiAgICAgIHJlcXVlc3RlZFksXG4gICAgICAoKSA9PiB7XG4gICAgICAgIHRoaXMuc2VuZFBheWxvYWQoW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGtpbmQ6IFwic2VsZWN0aW9uXCIsXG4gICAgICAgICAgICBjb250ZW50OiBzZWxlY3RlZFRleHQsXG4gICAgICAgICAgICBzb3VyY2VUaXRsZTpcbiAgICAgICAgICAgICAgYWN0aXZlRmlsZT8uYmFzZW5hbWUsXG4gICAgICAgICAgICBzb3VyY2VQYXRoOlxuICAgICAgICAgICAgICBhY3RpdmVGaWxlPy5wYXRoXG4gICAgICAgICAgfVxuICAgICAgICBdKTtcbiAgICAgIH1cbiAgICApO1xuICB9XG5cblxuICBwcml2YXRlIHNob3dJbWFnZUNhcHR1cmVBY3Rpb24oXG4gICAgaW1hZ2U6IEhUTUxJbWFnZUVsZW1lbnQsXG4gICAgY2xpY2tYOiBudW1iZXIsXG4gICAgY2xpY2tZOiBudW1iZXJcbiAgKTogdm9pZFxuICB7XG4gICAgLypcbiAgICAgUG9zaXRpb24gdGhlIGNhcHN1bGUgbmV4dCB0byB0aGUgY2xpY2sgcmF0aGVyXG4gICAgIHRoYW4gaW4gYSBmaXhlZCBpbWFnZSBjb3JuZXIuIFRoaXMgYXZvaWRzXG4gICAgIE9ic2lkaWFuJ3Mgb3duIHpvb20vc291cmNlIGNvbnRyb2xzIGFuZCByZXNpemVcbiAgICAgaGFuZGxlLlxuICAgICAqL1xuICAgIGNvbnN0IHJlcXVlc3RlZFggPVxuICAgICAgY2xpY2tYIC0gMzQ7XG5cbiAgICBjb25zdCByZXF1ZXN0ZWRZID1cbiAgICAgIGNsaWNrWSA+PSA0MFxuICAgICAgICA/IGNsaWNrWSAtIDM4XG4gICAgICAgIDogY2xpY2tZICsgMTA7XG5cbiAgICB0aGlzLnNob3dGbG9hdGluZ0FjdGlvbihcbiAgICAgIHJlcXVlc3RlZFgsXG4gICAgICByZXF1ZXN0ZWRZLFxuICAgICAgKCkgPT4ge1xuICAgICAgICB2b2lkIHRoaXMuc2VuZENsaWNrZWRJbWFnZShcbiAgICAgICAgICBpbWFnZVxuICAgICAgICApO1xuICAgICAgfVxuICAgICk7XG4gIH1cblxuXG4gIHByaXZhdGUgYXN5bmMgc2VuZENsaWNrZWRJbWFnZShcbiAgICBpbWFnZTogSFRNTEltYWdlRWxlbWVudFxuICApOiBQcm9taXNlPHZvaWQ+XG4gIHtcbiAgICBjb25zdCBzb3VyY2VDYW5kaWRhdGVzID1cbiAgICAgIFtcbiAgICAgICAgaW1hZ2UuY3VycmVudFNyYyxcbiAgICAgICAgaW1hZ2UuZ2V0QXR0cmlidXRlKFwic3JjXCIpLFxuICAgICAgICBpbWFnZS5nZXRBdHRyaWJ1dGUoXCJkYXRhLXNyY1wiKVxuICAgICAgXVxuICAgICAgLmZpbHRlcihcbiAgICAgICAgKHZhbHVlKTogdmFsdWUgaXMgc3RyaW5nID0+XG4gICAgICAgICAgQm9vbGVhbih2YWx1ZSlcbiAgICAgICk7XG5cbiAgICBjb25zdCByZW1vdGVTb3VyY2UgPVxuICAgICAgc291cmNlQ2FuZGlkYXRlcy5maW5kKFxuICAgICAgICAodmFsdWUpID0+XG4gICAgICAgICAgdmFsdWUuc3RhcnRzV2l0aChcImh0dHBzOi8vXCIpXG4gICAgICAgICAgfHwgdmFsdWUuc3RhcnRzV2l0aChcImh0dHA6Ly9cIilcbiAgICAgICk7XG5cbiAgICBsZXQgaWRlYTpcbiAgICAgIENhcHR1cmVJZGVhIHwgbnVsbCA9XG4gICAgICAgIG51bGw7XG5cbiAgICBpZiAocmVtb3RlU291cmNlKSB7XG4gICAgICBpZGVhID1cbiAgICAgICAgYXdhaXQgdGhpcy5pZGVhRnJvbVJlbW90ZUltYWdlKFxuICAgICAgICAgIHJlbW90ZVNvdXJjZVxuICAgICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBmaWxlID1cbiAgICAgICAgdGhpcy5yZXNvbHZlSW1hZ2VGaWxlRnJvbUVsZW1lbnQoXG4gICAgICAgICAgaW1hZ2UsXG4gICAgICAgICAgc291cmNlQ2FuZGlkYXRlc1xuICAgICAgICApO1xuXG4gICAgICBpZiAoIWZpbGUpIHtcbiAgICAgICAgbmV3IE5vdGljZShcbiAgICAgICAgICBcIkNvdWxkIG5vdCBsb2NhdGUgaW1hZ2UgaW4gdmF1bHRcIlxuICAgICAgICApO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlkZWEgPVxuICAgICAgICBhd2FpdCB0aGlzLmlkZWFGcm9tSW1hZ2VGaWxlKFxuICAgICAgICAgIGZpbGVcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBpZiAoaWRlYSkge1xuICAgICAgY29uc3QgYWN0aXZlTm90ZSA9XG4gICAgICAgIHRoaXMuYXBwLndvcmtzcGFjZS5nZXRBY3RpdmVGaWxlKCk7XG5cbiAgICAgIGlmIChcbiAgICAgICAgYWN0aXZlTm90ZVxuICAgICAgICAmJiBhY3RpdmVOb3RlLmV4dGVuc2lvbi50b0xvd2VyQ2FzZSgpID09PSBcIm1kXCJcbiAgICAgICkge1xuICAgICAgICBpZGVhLnNvdXJjZVRpdGxlID0gYWN0aXZlTm90ZS5iYXNlbmFtZTtcbiAgICAgICAgaWRlYS5zb3VyY2VQYXRoID0gYWN0aXZlTm90ZS5wYXRoO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnNlbmRQYXlsb2FkKFtcbiAgICAgICAgaWRlYVxuICAgICAgXSk7XG4gICAgfVxuICB9XG5cblxuICBwcml2YXRlIHJlc29sdmVJbWFnZUZpbGVGcm9tRWxlbWVudChcbiAgICBpbWFnZTogSFRNTEltYWdlRWxlbWVudCxcbiAgICBzb3VyY2VDYW5kaWRhdGVzOiBzdHJpbmdbXVxuICApOiBURmlsZSB8IG51bGxcbiAge1xuICAgIGNvbnN0IGNhbmRpZGF0ZXM6XG4gICAgICBzdHJpbmdbXSA9IFtdO1xuXG4gICAgY29uc3QgYWRkQ2FuZGlkYXRlID1cbiAgICAgIChcbiAgICAgICAgcmF3OlxuICAgICAgICAgIHN0cmluZyB8IG51bGwgfCB1bmRlZmluZWRcbiAgICAgICkgPT4ge1xuICAgICAgICBpZiAoIXJhdykge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCB2YWx1ZSA9IHJhdztcblxuICAgICAgICB0cnkge1xuICAgICAgICAgIHZhbHVlID1cbiAgICAgICAgICAgIGRlY29kZVVSSUNvbXBvbmVudChcbiAgICAgICAgICAgICAgdmFsdWVcbiAgICAgICAgICAgICk7XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIC8vIEtlZXAgb3JpZ2luYWwgdmFsdWUuXG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBxdWVyeUluZGV4ID1cbiAgICAgICAgICB2YWx1ZS5pbmRleE9mKFwiP1wiKTtcblxuICAgICAgICBpZiAocXVlcnlJbmRleCA+PSAwKSB7XG4gICAgICAgICAgdmFsdWUgPVxuICAgICAgICAgICAgdmFsdWUuc3Vic3RyaW5nKFxuICAgICAgICAgICAgICAwLFxuICAgICAgICAgICAgICBxdWVyeUluZGV4XG4gICAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgaGFzaEluZGV4ID1cbiAgICAgICAgICB2YWx1ZS5pbmRleE9mKFwiI1wiKTtcblxuICAgICAgICBpZiAoaGFzaEluZGV4ID49IDApIHtcbiAgICAgICAgICB2YWx1ZSA9XG4gICAgICAgICAgICB2YWx1ZS5zdWJzdHJpbmcoXG4gICAgICAgICAgICAgIDAsXG4gICAgICAgICAgICAgIGhhc2hJbmRleFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNhbmRpZGF0ZXMucHVzaCh2YWx1ZSk7XG4gICAgICB9O1xuXG4gICAgZm9yIChcbiAgICAgIGNvbnN0IHNvdXJjZVxuICAgICAgb2Ygc291cmNlQ2FuZGlkYXRlc1xuICAgICkge1xuICAgICAgYWRkQ2FuZGlkYXRlKHNvdXJjZSk7XG4gICAgfVxuXG4gICAgYWRkQ2FuZGlkYXRlKFxuICAgICAgaW1hZ2UuZ2V0QXR0cmlidXRlKFwiZGF0YS1wYXRoXCIpXG4gICAgKTtcblxuICAgIGFkZENhbmRpZGF0ZShcbiAgICAgIGltYWdlLmdldEF0dHJpYnV0ZShcImFsdFwiKVxuICAgICk7XG5cbiAgICBjb25zdCBpbWFnZUZpbGVzID1cbiAgICAgIHRoaXMuYXBwLnZhdWx0XG4gICAgICAgIC5nZXRGaWxlcygpXG4gICAgICAgIC5maWx0ZXIoXG4gICAgICAgICAgKGZpbGUpID0+XG4gICAgICAgICAgICB0aGlzLmlzU3VwcG9ydGVkSW1hZ2VGaWxlKFxuICAgICAgICAgICAgICBmaWxlXG4gICAgICAgICAgICApXG4gICAgICAgICk7XG5cbiAgICAvKlxuICAgICBQcmVmZXIgZXhhY3QvZnVsbC1wYXRoIHJlc29sdXRpb24uXG4gICAgICovXG4gICAgZm9yIChcbiAgICAgIGNvbnN0IGNhbmRpZGF0ZVxuICAgICAgb2YgY2FuZGlkYXRlc1xuICAgICkge1xuICAgICAgZm9yIChcbiAgICAgICAgY29uc3QgZmlsZVxuICAgICAgICBvZiBpbWFnZUZpbGVzXG4gICAgICApIHtcbiAgICAgICAgaWYgKFxuICAgICAgICAgIGNhbmRpZGF0ZSA9PT0gZmlsZS5wYXRoXG4gICAgICAgICAgfHwgY2FuZGlkYXRlLmVuZHNXaXRoKFxuICAgICAgICAgICAgXCIvXCIgKyBmaWxlLnBhdGhcbiAgICAgICAgICApXG4gICAgICAgICAgfHwgY2FuZGlkYXRlLmVuZHNXaXRoKFxuICAgICAgICAgICAgZmlsZS5wYXRoXG4gICAgICAgICAgKVxuICAgICAgICApIHtcbiAgICAgICAgICByZXR1cm4gZmlsZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8qXG4gICAgIEZpbGVuYW1lIGZhbGxiYWNrIG9ubHkgd2hlbiB0aGVyZSBpcyBleGFjdGx5XG4gICAgIG9uZSBtYXRjaGluZyBpbWFnZSBpbiB0aGUgdmF1bHQuXG4gICAgICovXG4gICAgZm9yIChcbiAgICAgIGNvbnN0IGNhbmRpZGF0ZVxuICAgICAgb2YgY2FuZGlkYXRlc1xuICAgICkge1xuICAgICAgY29uc3QgZmlsZW5hbWUgPVxuICAgICAgICBjYW5kaWRhdGVcbiAgICAgICAgICAuc3BsaXQoXCIvXCIpXG4gICAgICAgICAgLmZpbHRlcihCb29sZWFuKVxuICAgICAgICAgIC5wb3AoKTtcblxuICAgICAgaWYgKCFmaWxlbmFtZSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgbWF0Y2hlcyA9XG4gICAgICAgIGltYWdlRmlsZXMuZmlsdGVyKFxuICAgICAgICAgIChmaWxlKSA9PlxuICAgICAgICAgICAgZmlsZS5uYW1lID09PSBmaWxlbmFtZVxuICAgICAgICApO1xuXG4gICAgICBpZiAobWF0Y2hlcy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgcmV0dXJuIG1hdGNoZXNbMF07XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuXG4gIHByaXZhdGUgc2hvd0Zsb2F0aW5nQWN0aW9uKFxuICAgIHJlcXVlc3RlZFg6IG51bWJlcixcbiAgICByZXF1ZXN0ZWRZOiBudW1iZXIsXG4gICAgYWN0aW9uOiAoKSA9PiB2b2lkXG4gICk6IHZvaWRcbiAge1xuICAgIHRoaXMuaGlkZUZsb2F0aW5nQWN0aW9uKCk7XG5cbiAgICBjb25zdCBidXR0b24gPVxuICAgICAgZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcbiAgICAgICAgXCJidXR0b25cIlxuICAgICAgKTtcblxuICAgIGJ1dHRvbi50eXBlID1cbiAgICAgIFwiYnV0dG9uXCI7XG5cbiAgICBidXR0b24uY2xhc3NOYW1lID1cbiAgICAgIFwiaW56cnQtY2FwdHVyZS1idWJibGVcIjtcblxuICAgIGJ1dHRvbi5zZXRBdHRyaWJ1dGUoXG4gICAgICBcImFyaWEtbGFiZWxcIixcbiAgICAgIFwiU2VuZCB0byBEcmFmdGF2YVwiXG4gICAgKTtcblxuICAgIGNvbnN0IGljb24gPVxuICAgICAgZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcbiAgICAgICAgXCJzcGFuXCJcbiAgICAgICk7XG5cbiAgICBpY29uLmNsYXNzTmFtZSA9XG4gICAgICBcImluenJ0LWNhcHR1cmUtYnViYmxlLWljb25cIjtcblxuICAgIHNldEljb24oXG4gICAgICBpY29uLFxuICAgICAgXCJzZW5kXCJcbiAgICApO1xuXG4gICAgY29uc3QgbGFiZWwgPVxuICAgICAgZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcbiAgICAgICAgXCJzcGFuXCJcbiAgICAgICk7XG5cbiAgICBsYWJlbC5jbGFzc05hbWUgPVxuICAgICAgXCJpbnpydC1jYXB0dXJlLWJ1YmJsZS1sYWJlbFwiO1xuXG4gICAgbGFiZWwudGV4dENvbnRlbnQgPVxuICAgICAgXCJEcmFmdGF2YVwiO1xuXG4gICAgYnV0dG9uLmFwcGVuZENoaWxkKFxuICAgICAgaWNvblxuICAgICk7XG5cbiAgICBidXR0b24uYXBwZW5kQ2hpbGQoXG4gICAgICBsYWJlbFxuICAgICk7XG5cbiAgICBidXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgIFwicG9pbnRlcmRvd25cIixcbiAgICAgIChldmVudCkgPT4ge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgIH1cbiAgICApO1xuXG4gICAgYnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXG4gICAgICBcImNsaWNrXCIsXG4gICAgICAoZXZlbnQpID0+IHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cbiAgICAgICAgdGhpcy5oaWRlRmxvYXRpbmdBY3Rpb24oKTtcblxuICAgICAgICBhY3Rpb24oKTtcbiAgICAgIH1cbiAgICApO1xuXG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChcbiAgICAgIGJ1dHRvblxuICAgICk7XG5cbiAgICB0aGlzLmZsb2F0aW5nQWN0aW9uRWwgPVxuICAgICAgYnV0dG9uO1xuXG4gICAgY29uc3QgcmVjdCA9XG4gICAgICBidXR0b24uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICBjb25zdCBtYXJnaW4gPVxuICAgICAgODtcblxuICAgIGNvbnN0IHggPVxuICAgICAgTWF0aC5tYXgoXG4gICAgICAgIG1hcmdpbixcbiAgICAgICAgTWF0aC5taW4oXG4gICAgICAgICAgcmVxdWVzdGVkWCxcbiAgICAgICAgICB3aW5kb3cuaW5uZXJXaWR0aFxuICAgICAgICAgICAgLSByZWN0LndpZHRoXG4gICAgICAgICAgICAtIG1hcmdpblxuICAgICAgICApXG4gICAgICApO1xuXG4gICAgY29uc3QgeSA9XG4gICAgICBNYXRoLm1heChcbiAgICAgICAgbWFyZ2luLFxuICAgICAgICBNYXRoLm1pbihcbiAgICAgICAgICByZXF1ZXN0ZWRZLFxuICAgICAgICAgIHdpbmRvdy5pbm5lckhlaWdodFxuICAgICAgICAgICAgLSByZWN0LmhlaWdodFxuICAgICAgICAgICAgLSBtYXJnaW5cbiAgICAgICAgKVxuICAgICAgKTtcblxuICAgIGJ1dHRvbi5zdHlsZS5sZWZ0ID1cbiAgICAgIGAke3h9cHhgO1xuXG4gICAgYnV0dG9uLnN0eWxlLnRvcCA9XG4gICAgICBgJHt5fXB4YDtcbiAgfVxuXG5cbiAgcHJpdmF0ZSBoaWRlRmxvYXRpbmdBY3Rpb24oKTpcbiAgICB2b2lkXG4gIHtcbiAgICB0aGlzLmZsb2F0aW5nQWN0aW9uRWxcbiAgICAgID8ucmVtb3ZlKCk7XG5cbiAgICB0aGlzLmZsb2F0aW5nQWN0aW9uRWwgPVxuICAgICAgbnVsbDtcbiAgfVxuXG5cbiAgcHJpdmF0ZSBpc1N1cHBvcnRlZEltYWdlRmlsZShcbiAgICBmaWxlOiBURmlsZVxuICApOiBib29sZWFuIHtcbiAgICByZXR1cm4gW1xuICAgICAgXCJwbmdcIixcbiAgICAgIFwianBnXCIsXG4gICAgICBcImpwZWdcIixcbiAgICAgIFwid2VicFwiLFxuICAgICAgXCJnaWZcIixcbiAgICAgIFwiaGVpY1wiLFxuICAgICAgXCJoZWlmXCIsXG4gICAgICBcInRpZlwiLFxuICAgICAgXCJ0aWZmXCJcbiAgICBdLmluY2x1ZGVzKFxuICAgICAgZmlsZS5leHRlbnNpb25cbiAgICAgICAgLnRvTG93ZXJDYXNlKClcbiAgICApO1xuICB9XG5cblxuICBwcml2YXRlIG1pbWVUeXBlRm9yRXh0ZW5zaW9uKFxuICAgIGV4dGVuc2lvbjogc3RyaW5nXG4gICk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgc3dpdGNoIChcbiAgICAgIGV4dGVuc2lvbi50b0xvd2VyQ2FzZSgpXG4gICAgKSB7XG4gICAgICBjYXNlIFwicG5nXCI6XG4gICAgICAgIHJldHVybiBcImltYWdlL3BuZ1wiO1xuXG4gICAgICBjYXNlIFwianBnXCI6XG4gICAgICBjYXNlIFwianBlZ1wiOlxuICAgICAgICByZXR1cm4gXCJpbWFnZS9qcGVnXCI7XG5cbiAgICAgIGNhc2UgXCJ3ZWJwXCI6XG4gICAgICAgIHJldHVybiBcImltYWdlL3dlYnBcIjtcblxuICAgICAgY2FzZSBcImdpZlwiOlxuICAgICAgICByZXR1cm4gXCJpbWFnZS9naWZcIjtcblxuICAgICAgY2FzZSBcImhlaWNcIjpcbiAgICAgICAgcmV0dXJuIFwiaW1hZ2UvaGVpY1wiO1xuXG4gICAgICBjYXNlIFwiaGVpZlwiOlxuICAgICAgICByZXR1cm4gXCJpbWFnZS9oZWlmXCI7XG5cbiAgICAgIGNhc2UgXCJ0aWZcIjpcbiAgICAgIGNhc2UgXCJ0aWZmXCI6XG4gICAgICAgIHJldHVybiBcImltYWdlL3RpZmZcIjtcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuXG4gIHByaXZhdGUgYXN5bmMgaWRlYUZyb21JbWFnZUZpbGUoXG4gICAgZmlsZTogVEZpbGVcbiAgKTogUHJvbWlzZTxDYXB0dXJlSWRlYSB8IG51bGw+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgZGF0YSA9XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0XG4gICAgICAgICAgLnJlYWRCaW5hcnkoXG4gICAgICAgICAgICBmaWxlXG4gICAgICAgICAgKTtcblxuICAgICAgaWYgKFxuICAgICAgICBkYXRhLmJ5dGVMZW5ndGggPT09IDBcbiAgICAgICkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgXCJJbWFnZSBmaWxlIGlzIGVtcHR5XCJcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAga2luZDpcbiAgICAgICAgICBcImltYWdlXCIsXG5cbiAgICAgICAgaW1hZ2U6IHtcbiAgICAgICAgICBkYXRhQmFzZTY0OlxuICAgICAgICAgICAgQnVmZmVyXG4gICAgICAgICAgICAgIC5mcm9tKGRhdGEpXG4gICAgICAgICAgICAgIC50b1N0cmluZyhcbiAgICAgICAgICAgICAgICBcImJhc2U2NFwiXG4gICAgICAgICAgICAgICksXG5cbiAgICAgICAgICBtaW1lVHlwZTpcbiAgICAgICAgICAgIHRoaXMubWltZVR5cGVGb3JFeHRlbnNpb24oXG4gICAgICAgICAgICAgIGZpbGUuZXh0ZW5zaW9uXG4gICAgICAgICAgICApLFxuXG4gICAgICAgICAgb3JpZ2luYWxGaWxlTmFtZTpcbiAgICAgICAgICAgIGZpbGUubmFtZVxuICAgICAgICB9LFxuXG4gICAgICAgIHNvdXJjZVRpdGxlOlxuICAgICAgICAgIGZpbGUuYmFzZW5hbWUsXG5cbiAgICAgICAgc291cmNlUGF0aDpcbiAgICAgICAgICBmaWxlLnBhdGhcbiAgICAgIH07XG4gICAgfSBjYXRjaCAoXG4gICAgICBlcnJvclxuICAgICkge1xuICAgICAgY29uc29sZS5lcnJvcihcbiAgICAgICAgXCJbRHJhZnRhdmEgQ29tcGFuaW9uXSBsb2NhbCBpbWFnZSByZWFkIGZhaWxlZDpcIixcbiAgICAgICAgZXJyb3JcbiAgICAgICk7XG5cbiAgICAgIG5ldyBOb3RpY2UoXG4gICAgICAgIFwiQ291bGQgbm90IHJlYWQgaW1hZ2VcIlxuICAgICAgKTtcblxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cblxuICBwcml2YXRlIGFzeW5jIGlkZWFGcm9tUmVtb3RlSW1hZ2UoXG4gICAgcmF3VXJsOiBzdHJpbmdcbiAgKTogUHJvbWlzZTxDYXB0dXJlSWRlYSB8IG51bGw+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPVxuICAgICAgICBhd2FpdCByZXF1ZXN0VXJsKHtcbiAgICAgICAgICB1cmw6XG4gICAgICAgICAgICByYXdVcmwsXG5cbiAgICAgICAgICBtZXRob2Q6XG4gICAgICAgICAgICBcIkdFVFwiLFxuXG4gICAgICAgICAgdGhyb3c6XG4gICAgICAgICAgICBmYWxzZVxuICAgICAgICB9KTtcblxuICAgICAgaWYgKFxuICAgICAgICByZXNwb25zZS5zdGF0dXMgPCAyMDBcbiAgICAgICAgfHxcbiAgICAgICAgcmVzcG9uc2Uuc3RhdHVzID49IDMwMFxuICAgICAgKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgSFRUUCAke3Jlc3BvbnNlLnN0YXR1c31gXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIGlmIChcbiAgICAgICAgcmVzcG9uc2UuYXJyYXlCdWZmZXIuYnl0ZUxlbmd0aFxuICAgICAgICAgID09PSAwXG4gICAgICApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIFwiRG93bmxvYWRlZCBpbWFnZSBpcyBlbXB0eVwiXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGNvbnRlbnRUeXBlRW50cnkgPVxuICAgICAgICBPYmplY3QuZW50cmllcyhcbiAgICAgICAgICByZXNwb25zZS5oZWFkZXJzXG4gICAgICAgIClcbiAgICAgICAgLmZpbmQoXG4gICAgICAgICAgKFtrZXldKSA9PlxuICAgICAgICAgICAga2V5LnRvTG93ZXJDYXNlKClcbiAgICAgICAgICAgICAgPT09IFwiY29udGVudC10eXBlXCJcbiAgICAgICAgKTtcblxuICAgICAgY29uc3QgcmVzcG9uc2VNaW1lVHlwZSA9XG4gICAgICAgIGNvbnRlbnRUeXBlRW50cnlcbiAgICAgICAgICA/IFN0cmluZyhcbiAgICAgICAgICAgICAgY29udGVudFR5cGVFbnRyeVsxXVxuICAgICAgICAgICAgKVxuICAgICAgICAgICAgLnNwbGl0KFwiO1wiKVswXVxuICAgICAgICAgICAgLnRyaW0oKVxuICAgICAgICAgIDogdW5kZWZpbmVkO1xuXG4gICAgICBjb25zdCBwYXJzZWQgPVxuICAgICAgICBuZXcgVVJMKFxuICAgICAgICAgIHJhd1VybFxuICAgICAgICApO1xuXG4gICAgICBjb25zdCByYXdGaWxlTmFtZSA9XG4gICAgICAgIHBhcnNlZC5wYXRobmFtZVxuICAgICAgICAgIC5zcGxpdChcIi9cIilcbiAgICAgICAgICAuZmlsdGVyKEJvb2xlYW4pXG4gICAgICAgICAgLnBvcCgpO1xuXG4gICAgICBjb25zdCBvcmlnaW5hbEZpbGVOYW1lID1cbiAgICAgICAgcmF3RmlsZU5hbWVcbiAgICAgICAgICA/IGRlY29kZVVSSUNvbXBvbmVudChcbiAgICAgICAgICAgICAgcmF3RmlsZU5hbWVcbiAgICAgICAgICAgIClcbiAgICAgICAgICA6IHVuZGVmaW5lZDtcblxuICAgICAgY29uc3QgZXh0ZW5zaW9uID1cbiAgICAgICAgb3JpZ2luYWxGaWxlTmFtZVxuICAgICAgICAgID8uc3BsaXQoXCIuXCIpXG4gICAgICAgICAgLnBvcCgpXG4gICAgICAgICAgPy50b0xvd2VyQ2FzZSgpO1xuXG4gICAgICBjb25zdCBtaW1lVHlwZSA9XG4gICAgICAgIHJlc3BvbnNlTWltZVR5cGVcbiAgICAgICAgICA/LnRvTG93ZXJDYXNlKClcbiAgICAgICAgICAuc3RhcnRzV2l0aChcbiAgICAgICAgICAgIFwiaW1hZ2UvXCJcbiAgICAgICAgICApXG4gICAgICAgICAgPyByZXNwb25zZU1pbWVUeXBlXG4gICAgICAgICAgOiBleHRlbnNpb25cbiAgICAgICAgICAgID8gdGhpc1xuICAgICAgICAgICAgICAgIC5taW1lVHlwZUZvckV4dGVuc2lvbihcbiAgICAgICAgICAgICAgICAgIGV4dGVuc2lvblxuICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgIDogdW5kZWZpbmVkO1xuXG4gICAgICBpZiAoXG4gICAgICAgICFtaW1lVHlwZVxuICAgICAgKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBcIkRvd25sb2FkZWQgcmVzb3VyY2UgaXMgbm90IGEgc3VwcG9ydGVkIGltYWdlXCJcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAga2luZDpcbiAgICAgICAgICBcImltYWdlXCIsXG5cbiAgICAgICAgaW1hZ2U6IHtcbiAgICAgICAgICBkYXRhQmFzZTY0OlxuICAgICAgICAgICAgQnVmZmVyXG4gICAgICAgICAgICAgIC5mcm9tKFxuICAgICAgICAgICAgICAgIHJlc3BvbnNlLmFycmF5QnVmZmVyXG4gICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgLnRvU3RyaW5nKFxuICAgICAgICAgICAgICAgIFwiYmFzZTY0XCJcbiAgICAgICAgICAgICAgKSxcblxuICAgICAgICAgIG1pbWVUeXBlLFxuXG4gICAgICAgICAgb3JpZ2luYWxGaWxlTmFtZVxuICAgICAgICB9LFxuXG4gICAgICAgIHNvdXJjZVRpdGxlOlxuICAgICAgICAgIG9yaWdpbmFsRmlsZU5hbWUsXG5cbiAgICAgICAgc291cmNlUGF0aDpcbiAgICAgICAgICByYXdVcmxcbiAgICAgIH07XG4gICAgfSBjYXRjaCAoXG4gICAgICBlcnJvclxuICAgICkge1xuICAgICAgY29uc29sZS5lcnJvcihcbiAgICAgICAgXCJbRHJhZnRhdmEgQ29tcGFuaW9uXSByZW1vdGUgaW1hZ2UgZG93bmxvYWQgZmFpbGVkOlwiLFxuICAgICAgICBlcnJvclxuICAgICAgKTtcblxuICAgICAgbmV3IE5vdGljZShcbiAgICAgICAgXCJDb3VsZCBub3QgZG93bmxvYWQgaW1hZ2VcIlxuICAgICAgKTtcblxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cblxuICBwcml2YXRlIGFzeW5jIGlkZWFGcm9tRmlsZShcbiAgICBmaWxlOiBURmlsZVxuICApOiBQcm9taXNlPENhcHR1cmVJZGVhPiB7XG4gICAgY29uc3QgbWFya2Rvd24gPVxuICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHRcbiAgICAgICAgLmNhY2hlZFJlYWQoZmlsZSk7XG5cbiAgICAvKlxuICAgICBFbXB0eS90aXRsZS1vbmx5IG5vdGU6XG4gICAgIGZpbGVuYW1lIGJlY29tZXMgdGhlIElkZWEuXG5cbiAgICAgT3RoZXJ3aXNlIHByZXNlcnZlIHRoZSBub3RlIGJvZHkgZXhhY3RseS5cbiAgICAqL1xuICAgIGNvbnN0IGNvbnRlbnQgPVxuICAgICAgbWFya2Rvd24udHJpbSgpLmxlbmd0aCA+IDBcbiAgICAgICAgPyBtYXJrZG93blxuICAgICAgICA6IGZpbGUuYmFzZW5hbWU7XG5cbiAgICByZXR1cm4ge1xuICAgICAga2luZDpcbiAgICAgICAgXCJub3RlXCIsXG5cbiAgICAgIGNvbnRlbnQsXG5cbiAgICAgIHNvdXJjZVRpdGxlOlxuICAgICAgICBmaWxlLmJhc2VuYW1lLFxuXG4gICAgICBzb3VyY2VQYXRoOlxuICAgICAgICBmaWxlLnBhdGhcbiAgICB9O1xuICB9XG5cblxuICBwcml2YXRlIHNob3dEcmFmdGF2YVVuYXZhaWxhYmxlTm90aWNlKCk6IHZvaWQge1xuICAgIGNvbnN0IG5vdGljZSA9IG5ldyBOb3RpY2UoXCJcIiwgMTIwMDApO1xuXG4gICAgbm90aWNlLm1lc3NhZ2VFbC50ZXh0Q29udGVudCA9XG4gICAgICBcIkRyYWZ0YXZhIGFwcCBpcyBub3QgYXZhaWxhYmxlLiBcIjtcblxuICAgIGNvbnN0IGxpbmsgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYVwiKTtcbiAgICBsaW5rLnRleHRDb250ZW50ID0gXCJHZXQgRHJhZnRhdmFcIjtcbiAgICBsaW5rLmhyZWYgPSBEUkFGVEFWQV9XRUJTSVRFO1xuICAgIGxpbmsudGFyZ2V0ID0gXCJfYmxhbmtcIjtcbiAgICBsaW5rLnJlbCA9IFwibm9vcGVuZXIgbm9yZWZlcnJlclwiO1xuXG4gICAgbm90aWNlLm1lc3NhZ2VFbC5hcHBlbmRDaGlsZChsaW5rKTtcbiAgfVxuXG5cbiAgcHJpdmF0ZSBkaXNwYXRjaENhcHR1cmVGaWxlKFxuICAgIGNhcHR1cmVQYXRoOiBzdHJpbmcsXG4gICAgaWRlYUNvdW50OiBudW1iZXJcbiAgKTogdm9pZCB7XG4gICAgY29uc3Qgc2NyaXB0ID0gW1xuICAgICAgJ09iakMuaW1wb3J0KFwiQXBwS2l0XCIpOycsXG4gICAgICAndmFyIGFwcHMgPSAkLk5TV29ya3NwYWNlLnNoYXJlZFdvcmtzcGFjZS5ydW5uaW5nQXBwbGljYXRpb25zOycsXG4gICAgICAndmFyIG1hdGNoZXMgPSBbXTsnLFxuICAgICAgJ2ZvciAodmFyIGkgPSAwOyBpIDwgYXBwcy5jb3VudDsgaSsrKSB7JyxcbiAgICAgICcgIHZhciBhcHAgPSBhcHBzLm9iamVjdEF0SW5kZXgoaSk7JyxcbiAgICAgICcgIHZhciBpZGVudGlmaWVyID0gYXBwLmJ1bmRsZUlkZW50aWZpZXI7JyxcbiAgICAgICcgIGlmIChpZGVudGlmaWVyICYmIChPYmpDLnVud3JhcChpZGVudGlmaWVyKSA9PT0gXCJjb20ubG9jYWwuaW56cnRcIiB8fCBPYmpDLnVud3JhcChpZGVudGlmaWVyKSA9PT0gXCJjb20ubG9jYWwuaW56cnQuZmlsZWZpcnN0cHJvZHVjdGlvbnFhXCIpKSB7JyxcbiAgICAgICcgICAgdmFyIHVybCA9IGFwcC5idW5kbGVVUkw7JyxcbiAgICAgICcgICAgaWYgKHVybCkgbWF0Y2hlcy5wdXNoKE9iakMudW53cmFwKHVybC5wYXRoKSk7JyxcbiAgICAgICcgIH0nLFxuICAgICAgJ30nLFxuICAgICAgJ21hdGNoZXMuZmluZChmdW5jdGlvbihwYXRoKSB7JyxcbiAgICAgICcgIHJldHVybiBwYXRoICE9PSBcIi9BcHBsaWNhdGlvbnMvRHJhZnRhdmEuYXBwXCI7JyxcbiAgICAgICd9KSB8fCBtYXRjaGVzWzBdIHx8IFwiXCI7J1xuICAgIF0uam9pbihcIlxcblwiKTtcblxuICAgIGV4ZWNGaWxlKFxuICAgICAgXCIvdXNyL2Jpbi9vc2FzY3JpcHRcIixcbiAgICAgIFtcIi1sXCIsIFwiSmF2YVNjcmlwdFwiLCBcIi1lXCIsIHNjcmlwdF0sXG4gICAgICB7IHRpbWVvdXQ6IDgwMDAgfSxcbiAgICAgIChwcm9iZUVycm9yLCBzdGRvdXQpID0+IHtcbiAgICAgICAgaWYgKHByb2JlRXJyb3IpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKFxuICAgICAgICAgICAgXCJbRHJhZnRhdmEgQ29tcGFuaW9uXSBSdW5uaW5nLWFwcCBsb29rdXAgZmFpbGVkOlwiLFxuICAgICAgICAgICAgcHJvYmVFcnJvclxuICAgICAgICAgICk7XG4gICAgICAgICAgbmV3IE5vdGljZShcIkNvdWxkIG5vdCBsb2NhdGUgcnVubmluZyBEcmFmdGF2YVwiKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBydW5uaW5nUGF0aCA9IHN0ZG91dC50cmltKCk7XG4gICAgICAgIGNvbnN0IGFwcFBhdGggPSBydW5uaW5nUGF0aCB8fCBERUJVR19EUkFGVEFWQV9BUFA7XG5cbiAgICAgICAgaWYgKFxuICAgICAgICAgICFhcHBQYXRoLmVuZHNXaXRoKFwiLmFwcFwiKVxuICAgICAgICAgIHx8ICFleGlzdHNTeW5jKGFwcFBhdGgpXG4gICAgICAgICkge1xuICAgICAgICAgIHRoaXMuc2hvd0RyYWZ0YXZhVW5hdmFpbGFibGVOb3RpY2UoKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBleGVjRmlsZShcbiAgICAgICAgICBcIi91c3IvYmluL29wZW5cIixcbiAgICAgICAgICBbXCItYVwiLCBhcHBQYXRoLCBjYXB0dXJlUGF0aF0sXG4gICAgICAgICAgKGVycm9yKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcbiAgICAgICAgICAgICAgICBcIltEcmFmdGF2YSBDb21wYW5pb25dIG9wZW4gZmFpbGVkOlwiLFxuICAgICAgICAgICAgICAgIGVycm9yXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIG5ldyBOb3RpY2UoXCJDb3VsZCBub3Qgb3BlbiBEcmFmdGF2YVwiKTtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBuZXcgTm90aWNlKFxuICAgICAgICAgICAgICBpZGVhQ291bnQgPT09IDFcbiAgICAgICAgICAgICAgICA/IFwiU2VudCB0byBEcmFmdGF2YVwiXG4gICAgICAgICAgICAgICAgOiBgU2VudCAke2lkZWFDb3VudH0gSWRlYXMgdG8gRHJhZnRhdmFgXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICApO1xuICB9XG5cblxuICBwcml2YXRlIHNlbmRQYXlsb2FkKFxuICAgIGlkZWFzOiBDYXB0dXJlSWRlYVtdXG4gICk6IHZvaWQge1xuICAgIGlmIChcbiAgICAgIGlkZWFzLmxlbmd0aCA9PT0gMFxuICAgICkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBkaXJlY3RvcnkgPVxuICAgICAgICBqb2luKFxuICAgICAgICAgIHRtcGRpcigpLFxuICAgICAgICAgIFwiaW56cnQtY29tcGFuaW9uXCJcbiAgICAgICAgKTtcblxuICAgICAgbWtkaXJTeW5jKFxuICAgICAgICBkaXJlY3RvcnksXG4gICAgICAgIHtcbiAgICAgICAgICByZWN1cnNpdmU6XG4gICAgICAgICAgICB0cnVlXG4gICAgICAgIH1cbiAgICAgICk7XG5cbiAgICAgIGNvbnN0IGNhcHR1cmVQYXRoID1cbiAgICAgICAgam9pbihcbiAgICAgICAgICBkaXJlY3RvcnksXG4gICAgICAgICAgYCR7cmFuZG9tVVVJRCgpfS5pbnpydGNhcHR1cmVgXG4gICAgICAgICk7XG5cbiAgICAgIGNvbnN0IHZhdWx0TmFtZSA9XG4gICAgICAgIHRoaXMuYXBwLnZhdWx0LmdldE5hbWUoKTtcblxuICAgICAgY29uc3Qgb3V0Z29pbmdJZGVhcyA9XG4gICAgICAgIGlkZWFzLm1hcCgoaWRlYSkgPT4ge1xuICAgICAgICAgIGNvbnN0IGZpbGUgPVxuICAgICAgICAgICAgaWRlYS5zb3VyY2VQYXRoXG4gICAgICAgICAgICAgID8gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKFxuICAgICAgICAgICAgICAgICAgaWRlYS5zb3VyY2VQYXRoXG4gICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICA6IG51bGw7XG5cbiAgICAgICAgICBpZiAoIShmaWxlIGluc3RhbmNlb2YgVEZpbGUpKSB7XG4gICAgICAgICAgICByZXR1cm4gaWRlYTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgLi4uaWRlYSxcbiAgICAgICAgICAgIHNvdXJjZVVybDpcbiAgICAgICAgICAgICAgXCJvYnNpZGlhbjovL29wZW4/dmF1bHQ9XCJcbiAgICAgICAgICAgICAgKyBlbmNvZGVVUklDb21wb25lbnQodmF1bHROYW1lKVxuICAgICAgICAgICAgICArIFwiJmZpbGU9XCJcbiAgICAgICAgICAgICAgKyBlbmNvZGVVUklDb21wb25lbnQoZmlsZS5wYXRoKVxuICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuXG4gICAgICBjb25zdCBlbnZlbG9wZTpcbiAgICAgICAgQ2FwdHVyZUVudmVsb3BlID1cbiAgICAgIHtcbiAgICAgICAgdmVyc2lvbjpcbiAgICAgICAgICAxLFxuXG4gICAgICAgIGlkZWFzOiBvdXRnb2luZ0lkZWFzXG4gICAgICB9O1xuXG4gICAgICB3cml0ZUZpbGVTeW5jKFxuICAgICAgICBjYXB0dXJlUGF0aCxcbiAgICAgICAgSlNPTi5zdHJpbmdpZnkoXG4gICAgICAgICAgZW52ZWxvcGUsXG4gICAgICAgICAgbnVsbCxcbiAgICAgICAgICAyXG4gICAgICAgICksXG4gICAgICAgIFwidXRmOFwiXG4gICAgICApO1xuXG4gICAgICB0aGlzLmRpc3BhdGNoQ2FwdHVyZUZpbGUoXG4gICAgICAgIGNhcHR1cmVQYXRoLFxuICAgICAgICBpZGVhcy5sZW5ndGhcbiAgICAgICk7XG4gICAgfSBjYXRjaCAoXG4gICAgICBlcnJvclxuICAgICkge1xuICAgICAgY29uc29sZS5lcnJvcihcbiAgICAgICAgXCJbRHJhZnRhdmEgQ29tcGFuaW9uXSBzZW5kIGZhaWxlZDpcIixcbiAgICAgICAgZXJyb3JcbiAgICAgICk7XG5cbiAgICAgIG5ldyBOb3RpY2UoXG4gICAgICAgIFwiQ291bGQgbm90IHNlbmQgdG8gRHJhZnRhdmFcIlxuICAgICAgKTtcbiAgICB9XG4gIH1cbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLHNCQVNPO0FBRVAseUJBRU87QUFFUCxnQ0FFTztBQUVQLHlCQUVPO0FBRVAscUJBSU87QUFFUCxxQkFFTztBQUVQLHVCQUVPO0FBR1AsSUFBTSxxQkFDSjtBQUVGLElBQU0sbUJBQ0o7QUE4QkYsSUFBcUIsMEJBQXJCLGNBQ1UsdUJBQ1Y7QUFBQSxFQUNVLG1CQUNlO0FBQUEsRUFFdkIsTUFBTSxTQUF3QjtBQUM1QixTQUFLLHVCQUF1QjtBQUM1QixTQUFLLHNCQUFzQjtBQUMzQixTQUFLLCtCQUErQjtBQUVwQyxTQUFL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VUFBVTtBQUNULGdCQUFJLE9BQU87QUFDVCxzQkFBUTtBQUFBLGdCQUNOO0FBQUEsZ0JBQ0E7QUFBQSxjQUNGO0FBQ0Esa0JBQUksdUJBQU8seUJBQXlCO0FBQ3BDO0FBQUEsWUFDRjtBQUVBLGdCQUFJO0FBQUEsY0FDRixjQUFjLElBQ1YscUJBQ0EsUUFBUSxTQUFTO0FBQUEsWUFDdkI7QUFBQSxVQUNGO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBR1EsWUFDTixPQUNNO0FBQ04sUUFDRSxNQUFNLFdBQVcsR0FDakI7QUFDQTtBQUFBLElBQ0Y7QUFFQSxRQUFJO0FBQ0YsWUFBTSxnQkFDSjtBQUFBLFlBQ0UsdUJBQU87QUFBQSxRQUNQO0FBQUEsTUFDRjtBQUVGO0FBQUEsUUFDRTtBQUFBLFFBQ0E7QUFBQSxVQUNFLFdBQ0U7QUFBQSxRQUNKO0FBQUEsTUFDRjtBQUVBLFlBQU0sa0JBQ0o7QUFBQSxRQUNFO0FBQUEsUUFDQSxPQUFHLCtCQUFXLENBQUM7QUFBQSxNQUNqQjtBQUVGLFlBQU0sWUFDSixLQUFLLElBQUksTUFBTSxRQUFRO0FBRXpCLFlBQU0sZ0JBQ0osTUFBTSxJQUFJLENBQUMsU0FBUztBQUNsQixjQUFNLE9BQ0osS0FBSyxhQUNELEtBQUssSUFBSSxNQUFNO0FBQUEsVUFDYixLQUFLO0FBQUEsUUFDUCxJQUNBO0FBRU4sWUFBSSxFQUFFLGdCQUFnQix3QkFBUTtBQUM1QixpQkFBTztBQUFBLFFBQ1Q7QUFFQSxlQUFPO0FBQUEsVUFDTCxHQUFHO0FBQUEsVUFDSCxXQUNFLDJCQUNFLG1CQUFtQixTQUFTLElBQzVCLFdBQ0EsbUJBQW1CLEtBQUssSUFBSTtBQUFBLFFBQ2xDO0FBQUEsTUFDRixDQUFDO0FBRUgsWUFBTSxXQUVOO0FBQUEsUUFDRSxTQUNFO0FBQUEsUUFFRixPQUFPO0FBQUEsTUFDVDtBQUVBO0FBQUEsUUFDRTtBQUFBLFFBQ0EsS0FBSztBQUFBLFVBQ0g7QUFBQSxVQUNBO0FBQUEsVUFDQTtBQUFBLFFBQ0Y7QUFBQSxRQUNBO0FBQUEsTUFDRjtBQUVBLFdBQUs7QUFBQSxRQUNIO0FBQUEsUUFDQSxNQUFNO0FBQUEsTUFDUjtBQUFBLElBQ0YsU0FDRSxPQUNBO0FBQ0EsY0FBUTtBQUFBLFFBQ047QUFBQSxRQUNBO0FBQUEsTUFDRjtBQUVBLFVBQUk7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0Y7IiwKICAibmFtZXMiOiBbXQp9Cg==
