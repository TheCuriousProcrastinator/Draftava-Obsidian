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
      '  if (identifier && ObjC.unwrap(identifier) === "com.local.inzrt") {',
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB7XG4gIE1lbnUsXG4gIE1hcmtkb3duVmlldyxcbiAgTm90aWNlLFxuICBQbHVnaW4sXG4gIHJlcXVlc3RVcmwsXG4gIHNldEljb24sXG4gIFRBYnN0cmFjdEZpbGUsXG4gIFRGaWxlXG59IGZyb20gXCJvYnNpZGlhblwiO1xuXG5pbXBvcnQge1xuICBCdWZmZXJcbn0gZnJvbSBcIm5vZGU6YnVmZmVyXCI7XG5cbmltcG9ydCB7XG4gIGV4ZWNGaWxlXG59IGZyb20gXCJub2RlOmNoaWxkX3Byb2Nlc3NcIjtcblxuaW1wb3J0IHtcbiAgcmFuZG9tVVVJRFxufSBmcm9tIFwibm9kZTpjcnlwdG9cIjtcblxuaW1wb3J0IHtcbiAgZXhpc3RzU3luYyxcbiAgbWtkaXJTeW5jLFxuICB3cml0ZUZpbGVTeW5jXG59IGZyb20gXCJub2RlOmZzXCI7XG5cbmltcG9ydCB7XG4gIHRtcGRpclxufSBmcm9tIFwibm9kZTpvc1wiO1xuXG5pbXBvcnQge1xuICBqb2luXG59IGZyb20gXCJub2RlOnBhdGhcIjtcblxuXG5jb25zdCBERUJVR19EUkFGVEFWQV9BUFAgPVxuICBcIi9BcHBsaWNhdGlvbnMvRHJhZnRhdmEuYXBwXCI7XG5cbmNvbnN0IERSQUZUQVZBX1dFQlNJVEUgPVxuICBcImh0dHBzOi8vb2ZmZW5zaXZlY2FmZmVpbmUuY29tL2RyYWZ0YXZhL1wiO1xuXG5cbmludGVyZmFjZSBDYXB0dXJlSW1hZ2Uge1xuICBkYXRhQmFzZTY0OiBzdHJpbmc7XG4gIG1pbWVUeXBlPzogc3RyaW5nO1xuICBvcmlnaW5hbEZpbGVOYW1lPzogc3RyaW5nO1xufVxuXG5cbmludGVyZmFjZSBDYXB0dXJlSWRlYSB7XG4gIGtpbmQ6XG4gICAgfCBcInNlbGVjdGlvblwiXG4gICAgfCBcIm5vdGVcIlxuICAgIHwgXCJpbWFnZVwiO1xuXG4gIGNvbnRlbnQ/OiBzdHJpbmc7XG4gIGltYWdlPzogQ2FwdHVyZUltYWdlO1xuICBzb3VyY2VUaXRsZT86IHN0cmluZztcbiAgc291cmNlUGF0aD86IHN0cmluZztcbn1cblxuXG5pbnRlcmZhY2UgQ2FwdHVyZUVudmVsb3BlIHtcbiAgdmVyc2lvbjogMTtcbiAgaWRlYXM6IENhcHR1cmVJZGVhW107XG59XG5cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRHJhZnRhdmFDb21wYW5pb25QbHVnaW5cbiAgZXh0ZW5kcyBQbHVnaW5cbntcbiAgcHJpdmF0ZSBmbG9hdGluZ0FjdGlvbkVsOlxuICAgIEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XG5cbiAgYXN5bmMgb25sb2FkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMucmVnaXN0ZXJTaW5nbGVGaWxlTWVudSgpO1xuICAgIHRoaXMucmVnaXN0ZXJNdWx0aUZpbGVNZW51KCk7XG4gICAgdGhpcy5yZWdpc3RlckZsb2F0aW5nQ2FwdHVyZUFjdGlvbnMoKTtcblxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogXCJvcGVuLWRyYWZ0YXZhLXdlYnNpdGVcIixcbiAgICAgIG5hbWU6IFwiR2V0IERyYWZ0YXZhXCIsXG4gICAgICBjYWxsYmFjazogKCkgPT4ge1xuICAgICAgICB3aW5kb3cub3BlbihcbiAgICAgICAgICBEUkFGVEFWQV9XRUJTSVRFLFxuICAgICAgICAgIFwiX2JsYW5rXCIsXG4gICAgICAgICAgXCJub29wZW5lcixub3JlZmVycmVyXCJcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIG5ldyBOb3RpY2UoXG4gICAgICBcIkRyYWZ0YXZhIENvbXBhbmlvbiBsb2FkZWRcIlxuICAgICk7XG4gIH1cblxuXG4gIC8qXG4gICBPYnNpZGlhbiBjdXJyZW50bHkgZW1pdHMgZWRpdG9yLW1lbnUgYW5kXG4gICBmaWxlcy1tZW51IGF0IHJ1bnRpbWUuXG5cbiAgIGZpbGVzLW1lbnUgaXMgbm90IGNsZWFubHkgcmVwcmVzZW50ZWQgaW4gYWxsXG4gICBwdWJsaXNoZWQgVHlwZVNjcmlwdCBkZWNsYXJhdGlvbiB2ZXJzaW9ucywgc29cbiAgIHRoaXMgcHJvdG90eXBlIGludGVudGlvbmFsbHkga2VlcHMgdGhlIHJ1bnRpbWVcbiAgIGV2ZW50IGJyaWRnZSB1bnR5cGVkIHJhdGhlciB0aGFuIGludmVudGluZ1xuICAgY29uZmxpY3Rpbmcgb3ZlcmxvYWRzLlxuICAqL1xuICBwcml2YXRlIHJ1bnRpbWVXb3Jrc3BhY2UoKTogYW55IHtcbiAgICByZXR1cm4gdGhpcy5hcHAud29ya3NwYWNlO1xuICB9XG5cblxuICBwcml2YXRlIHJlZ2lzdGVyU2luZ2xlRmlsZU1lbnUoKTpcbiAgICB2b2lkXG4gIHtcbiAgICB0aGlzLnJlZ2lzdGVyRXZlbnQoXG4gICAgICB0aGlzLmFwcC53b3Jrc3BhY2Uub24oXG4gICAgICAgIFwiZmlsZS1tZW51XCIsXG4gICAgICAgIChcbiAgICAgICAgICBtZW51OiBNZW51LFxuICAgICAgICAgIGZpbGU6IFRBYnN0cmFjdEZpbGVcbiAgICAgICAgKSA9PiB7XG4gICAgICAgICAgaWYgKFxuICAgICAgICAgICAgIShmaWxlIGluc3RhbmNlb2YgVEZpbGUpXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3QgaXNNYXJrZG93biA9XG4gICAgICAgICAgICBmaWxlLmV4dGVuc2lvblxuICAgICAgICAgICAgICAudG9Mb3dlckNhc2UoKVxuICAgICAgICAgICAgICA9PT0gXCJtZFwiO1xuXG4gICAgICAgICAgY29uc3QgaXNJbWFnZSA9XG4gICAgICAgICAgICB0aGlzLmlzU3VwcG9ydGVkSW1hZ2VGaWxlKFxuICAgICAgICAgICAgICBmaWxlXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgaWYgKFxuICAgICAgICAgICAgIWlzTWFya2Rvd25cbiAgICAgICAgICAgICYmXG4gICAgICAgICAgICAhaXNJbWFnZVxuICAgICAgICAgICkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIG1lbnUuYWRkSXRlbShcbiAgICAgICAgICAgIChpdGVtKSA9PiB7XG4gICAgICAgICAgICAgIGl0ZW1cbiAgICAgICAgICAgICAgICAuc2V0VGl0bGUoXG4gICAgICAgICAgICAgICAgICBcIlNlbmQgdG8gRHJhZnRhdmFcIlxuICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICAuc2V0SWNvbihcInNlbmRcIilcbiAgICAgICAgICAgICAgICAub25DbGljayhcbiAgICAgICAgICAgICAgICAgIGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaWRlYSA9XG4gICAgICAgICAgICAgICAgICAgICAgaXNJbWFnZVxuICAgICAgICAgICAgICAgICAgICAgICAgPyBhd2FpdCB0aGlzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLmlkZWFGcm9tSW1hZ2VGaWxlKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICAgICAgICAgIDogYXdhaXQgdGhpc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5pZGVhRnJvbUZpbGUoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgICAgICAgaWRlYVxuICAgICAgICAgICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNlbmRQYXlsb2FkKFtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkZWFcbiAgICAgICAgICAgICAgICAgICAgICBdKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgKVxuICAgICk7XG4gIH1cblxuXG4gIHByaXZhdGUgcmVnaXN0ZXJNdWx0aUZpbGVNZW51KCk6XG4gICAgdm9pZFxuICB7XG4gICAgY29uc3Qgd29ya3NwYWNlOiBhbnkgPVxuICAgICAgdGhpcy5ydW50aW1lV29ya3NwYWNlKCk7XG5cbiAgICB0aGlzLnJlZ2lzdGVyRXZlbnQoXG4gICAgICB3b3Jrc3BhY2Uub24oXG4gICAgICAgIFwiZmlsZXMtbWVudVwiLFxuICAgICAgICAoXG4gICAgICAgICAgbWVudTogTWVudSxcbiAgICAgICAgICBmaWxlczogVEFic3RyYWN0RmlsZVtdXG4gICAgICAgICkgPT4ge1xuICAgICAgICAgIGNvbnN0IG5vdGVzID1cbiAgICAgICAgICAgIGZpbGVzLmZpbHRlcihcbiAgICAgICAgICAgICAgKFxuICAgICAgICAgICAgICAgIGZpbGVcbiAgICAgICAgICAgICAgKTogZmlsZSBpcyBURmlsZSA9PlxuICAgICAgICAgICAgICAgIGZpbGUgaW5zdGFuY2VvZiBURmlsZVxuICAgICAgICAgICAgICAgICYmXG4gICAgICAgICAgICAgICAgZmlsZS5leHRlbnNpb25cbiAgICAgICAgICAgICAgICAgIC50b0xvd2VyQ2FzZSgpXG4gICAgICAgICAgICAgICAgICA9PT0gXCJtZFwiXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgaWYgKFxuICAgICAgICAgICAgbm90ZXMubGVuZ3RoIDwgMlxuICAgICAgICAgICkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIG1lbnUuYWRkSXRlbShcbiAgICAgICAgICAgIChpdGVtOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgaXRlbVxuICAgICAgICAgICAgICAgIC5zZXRUaXRsZShcbiAgICAgICAgICAgICAgICAgIFwiU2VuZCB0byBEcmFmdGF2YVwiXG4gICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgIC5zZXRJY29uKFwic2VuZFwiKVxuICAgICAgICAgICAgICAgIC5vbkNsaWNrKFxuICAgICAgICAgICAgICAgICAgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpZGVhcyA9XG4gICAgICAgICAgICAgICAgICAgICAgYXdhaXQgUHJvbWlzZS5hbGwoXG4gICAgICAgICAgICAgICAgICAgICAgICBub3Rlcy5tYXAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgIChmaWxlKSA9PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaWRlYUZyb21GaWxlKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2VuZFBheWxvYWQoXG4gICAgICAgICAgICAgICAgICAgICAgaWRlYXNcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIClcbiAgICApO1xuICB9XG5cblxuICBwcml2YXRlIHJlZ2lzdGVyRmxvYXRpbmdDYXB0dXJlQWN0aW9ucygpOlxuICAgIHZvaWRcbiAge1xuICAgIC8qXG4gICAgIFRleHQgc2VsZWN0aW9uLlxuXG4gICAgIFdlIHVzZSB0aGUgT2JzaWRpYW4gZWRpdG9yIGZvciB0aGUgYWN0dWFsIHRleHRcbiAgICAgd2hlbmV2ZXIgcG9zc2libGUsIGFuZCBET00gZ2VvbWV0cnkgb25seSB0b1xuICAgICBwb3NpdGlvbiB0aGUgdmlzdWFsIGNhcHN1bGUuXG4gICAgICovXG4gICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KFxuICAgICAgZG9jdW1lbnQsXG4gICAgICBcIm1vdXNldXBcIixcbiAgICAgICgpID0+IHtcbiAgICAgICAgd2luZG93LnNldFRpbWVvdXQoXG4gICAgICAgICAgKCkgPT4gdGhpcy5zaG93VGV4dFNlbGVjdGlvbkFjdGlvbigpLFxuICAgICAgICAgIDBcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICApO1xuXG4gICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KFxuICAgICAgZG9jdW1lbnQsXG4gICAgICBcImtleXVwXCIsXG4gICAgICAoZXZlbnQ6IEtleWJvYXJkRXZlbnQpID0+IHtcbiAgICAgICAgaWYgKGV2ZW50LmtleSA9PT0gXCJFc2NhcGVcIikge1xuICAgICAgICAgIHRoaXMuaGlkZUZsb2F0aW5nQWN0aW9uKCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKFxuICAgICAgICAgIGV2ZW50LnNoaWZ0S2V5XG4gICAgICAgICAgfHwgZXZlbnQua2V5LnN0YXJ0c1dpdGgoXCJBcnJvd1wiKVxuICAgICAgICApIHtcbiAgICAgICAgICB3aW5kb3cuc2V0VGltZW91dChcbiAgICAgICAgICAgICgpID0+IHRoaXMuc2hvd1RleHRTZWxlY3Rpb25BY3Rpb24oKSxcbiAgICAgICAgICAgIDBcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgKTtcblxuICAgIC8qXG4gICAgIEltYWdlIGNsaWNrLlxuXG4gICAgIERvIG5vdCBwcmV2ZW50RGVmYXVsdCBvciBzdG9wUHJvcGFnYXRpb24uXG4gICAgIE9ic2lkaWFuIHJlbWFpbnMgZnVsbHkgcmVzcG9uc2libGUgZm9yIG5hdGl2ZVxuICAgICBpbWFnZSBzZWxlY3Rpb24sIHJlc2l6ZSBoYW5kbGVzIGFuZCBjb250cm9scy5cbiAgICAgKi9cbiAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoXG4gICAgICBkb2N1bWVudCxcbiAgICAgIFwiY2xpY2tcIixcbiAgICAgIChldmVudDogTW91c2VFdmVudCkgPT4ge1xuICAgICAgICBjb25zdCB0YXJnZXQgPVxuICAgICAgICAgIGV2ZW50LnRhcmdldCBpbnN0YW5jZW9mIEVsZW1lbnRcbiAgICAgICAgICAgID8gZXZlbnQudGFyZ2V0XG4gICAgICAgICAgICA6IG51bGw7XG5cbiAgICAgICAgaWYgKCF0YXJnZXQpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoXG4gICAgICAgICAgdGhpcy5mbG9hdGluZ0FjdGlvbkVsXG4gICAgICAgICAgJiYgdGhpcy5mbG9hdGluZ0FjdGlvbkVsLmNvbnRhaW5zKHRhcmdldClcbiAgICAgICAgKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgaW1hZ2UgPVxuICAgICAgICAgIHRoaXMuZmluZENsaWNrZWRJbWFnZSh0YXJnZXQpO1xuXG4gICAgICAgIGlmICghaW1hZ2UpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoXG4gICAgICAgICAgIWltYWdlLmNsb3Nlc3QoXG4gICAgICAgICAgICBcIi5tYXJrZG93bi1zb3VyY2UtdmlldywgLm1hcmtkb3duLXByZXZpZXctdmlld1wiXG4gICAgICAgICAgKVxuICAgICAgICApIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB4ID0gZXZlbnQuY2xpZW50WDtcbiAgICAgICAgY29uc3QgeSA9IGV2ZW50LmNsaWVudFk7XG5cbiAgICAgICAgd2luZG93LnNldFRpbWVvdXQoXG4gICAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zaG93SW1hZ2VDYXB0dXJlQWN0aW9uKFxuICAgICAgICAgICAgICBpbWFnZSxcbiAgICAgICAgICAgICAgeCxcbiAgICAgICAgICAgICAgeVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIDBcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICApO1xuXG4gICAgLypcbiAgICAgQW55IG5ldyBpbnRlcmFjdGlvbiBvdXRzaWRlIHRoZSBjYXBzdWxlIGRpc21pc3Nlc1xuICAgICB0aGUgcHJldmlvdXMgYWN0aW9uLlxuICAgICAqL1xuICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChcbiAgICAgIGRvY3VtZW50LFxuICAgICAgXCJwb2ludGVyZG93blwiLFxuICAgICAgKGV2ZW50OiBQb2ludGVyRXZlbnQpID0+IHtcbiAgICAgICAgY29uc3QgdGFyZ2V0ID1cbiAgICAgICAgICBldmVudC50YXJnZXQgaW5zdGFuY2VvZiBOb2RlXG4gICAgICAgICAgICA/IGV2ZW50LnRhcmdldFxuICAgICAgICAgICAgOiBudWxsO1xuXG4gICAgICAgIGlmIChcbiAgICAgICAgICB0YXJnZXRcbiAgICAgICAgICAmJiB0aGlzLmZsb2F0aW5nQWN0aW9uRWxcbiAgICAgICAgICAmJiB0aGlzLmZsb2F0aW5nQWN0aW9uRWwuY29udGFpbnModGFyZ2V0KVxuICAgICAgICApIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmhpZGVGbG9hdGluZ0FjdGlvbigpO1xuICAgICAgfSxcbiAgICAgIHRydWVcbiAgICApO1xuXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXG4gICAgICBcInNjcm9sbFwiLFxuICAgICAgdGhpcy5oaWRlRmxvYXRpbmdBY3Rpb25Cb3VuZCxcbiAgICAgIHRydWVcbiAgICApO1xuXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXG4gICAgICBcInJlc2l6ZVwiLFxuICAgICAgdGhpcy5oaWRlRmxvYXRpbmdBY3Rpb25Cb3VuZFxuICAgICk7XG5cbiAgICB0aGlzLnJlZ2lzdGVyKFxuICAgICAgKCkgPT4ge1xuICAgICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcihcbiAgICAgICAgICBcInNjcm9sbFwiLFxuICAgICAgICAgIHRoaXMuaGlkZUZsb2F0aW5nQWN0aW9uQm91bmQsXG4gICAgICAgICAgdHJ1ZVxuICAgICAgICApO1xuXG4gICAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKFxuICAgICAgICAgIFwicmVzaXplXCIsXG4gICAgICAgICAgdGhpcy5oaWRlRmxvYXRpbmdBY3Rpb25Cb3VuZFxuICAgICAgICApO1xuXG4gICAgICAgIHRoaXMuaGlkZUZsb2F0aW5nQWN0aW9uKCk7XG4gICAgICB9XG4gICAgKTtcbiAgfVxuXG5cbiAgcHJpdmF0ZSBoaWRlRmxvYXRpbmdBY3Rpb25Cb3VuZCA9XG4gICAgKCk6IHZvaWQgPT4ge1xuICAgICAgdGhpcy5oaWRlRmxvYXRpbmdBY3Rpb24oKTtcbiAgICB9O1xuXG5cbiAgcHJpdmF0ZSBmaW5kQ2xpY2tlZEltYWdlKFxuICAgIHN0YXJ0OiBFbGVtZW50XG4gICk6IEhUTUxJbWFnZUVsZW1lbnQgfCBudWxsXG4gIHtcbiAgICBsZXQgZWxlbWVudDogRWxlbWVudCB8IG51bGwgPVxuICAgICAgc3RhcnQ7XG5cbiAgICB3aGlsZSAoZWxlbWVudCkge1xuICAgICAgaWYgKFxuICAgICAgICBlbGVtZW50IGluc3RhbmNlb2YgSFRNTEltYWdlRWxlbWVudFxuICAgICAgKSB7XG4gICAgICAgIHJldHVybiBlbGVtZW50O1xuICAgICAgfVxuXG4gICAgICBlbGVtZW50ID1cbiAgICAgICAgZWxlbWVudC5wYXJlbnRFbGVtZW50O1xuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9XG5cblxuICBwcml2YXRlIGdldFNlbGVjdGlvbkFuY2hvclJlY3QoXG4gICAgdmlldzogTWFya2Rvd25WaWV3IHwgbnVsbFxuICApOiBET01SZWN0IHwgbnVsbFxuICB7XG4gICAgY29uc3Qgc2VsZWN0aW9uID1cbiAgICAgIHdpbmRvdy5nZXRTZWxlY3Rpb24oKTtcblxuICAgIGlmIChcbiAgICAgIHNlbGVjdGlvblxuICAgICAgJiYgc2VsZWN0aW9uLnJhbmdlQ291bnQgPiAwXG4gICAgICAmJiAhc2VsZWN0aW9uLmlzQ29sbGFwc2VkXG4gICAgKSB7XG4gICAgICBjb25zdCByYW5nZSA9XG4gICAgICAgIHNlbGVjdGlvbi5nZXRSYW5nZUF0KDApO1xuXG4gICAgICBjb25zdCBjbGllbnRSZWN0cyA9XG4gICAgICAgIEFycmF5LmZyb20oXG4gICAgICAgICAgcmFuZ2UuZ2V0Q2xpZW50UmVjdHMoKVxuICAgICAgICApXG4gICAgICAgIC5maWx0ZXIoXG4gICAgICAgICAgKHJlY3QpID0+XG4gICAgICAgICAgICByZWN0LndpZHRoID4gMFxuICAgICAgICAgICAgJiYgcmVjdC5oZWlnaHQgPiAwXG4gICAgICAgICk7XG5cbiAgICAgIGlmIChjbGllbnRSZWN0cy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHJldHVybiBjbGllbnRSZWN0c1tcbiAgICAgICAgICBjbGllbnRSZWN0cy5sZW5ndGggLSAxXG4gICAgICAgIF07XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGJvdW5kaW5nUmVjdCA9XG4gICAgICAgIHJhbmdlLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXG4gICAgICBpZiAoXG4gICAgICAgIGJvdW5kaW5nUmVjdC53aWR0aCA+IDBcbiAgICAgICAgfHwgYm91bmRpbmdSZWN0LmhlaWdodCA+IDBcbiAgICAgICkge1xuICAgICAgICByZXR1cm4gYm91bmRpbmdSZWN0O1xuICAgICAgfVxuICAgIH1cblxuICAgIC8qXG4gICAgIExpdmUgUHJldmlldyBmYWxsYmFjay5cblxuICAgICBDb2RlTWlycm9yIHJlbmRlcnMgc2VsZWN0ZWQgcmVnaW9ucyBhc1xuICAgICBjbS1zZWxlY3Rpb25CYWNrZ3JvdW5kIGVsZW1lbnRzLlxuICAgICAqL1xuICAgIGlmICh2aWV3KSB7XG4gICAgICBjb25zdCBzZWxlY3Rpb25SZWN0cyA9XG4gICAgICAgIEFycmF5LmZyb20oXG4gICAgICAgICAgdmlldy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yQWxsPEhUTUxFbGVtZW50PihcbiAgICAgICAgICAgIFwiLmNtLXNlbGVjdGlvbkJhY2tncm91bmRcIlxuICAgICAgICAgIClcbiAgICAgICAgKVxuICAgICAgICAubWFwKFxuICAgICAgICAgIChlbGVtZW50KSA9PlxuICAgICAgICAgICAgZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKVxuICAgICAgICApXG4gICAgICAgIC5maWx0ZXIoXG4gICAgICAgICAgKHJlY3QpID0+XG4gICAgICAgICAgICByZWN0LndpZHRoID4gMFxuICAgICAgICAgICAgJiYgcmVjdC5oZWlnaHQgPiAwXG4gICAgICAgICk7XG5cbiAgICAgIGlmIChzZWxlY3Rpb25SZWN0cy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHJldHVybiBzZWxlY3Rpb25SZWN0c1tcbiAgICAgICAgICBzZWxlY3Rpb25SZWN0cy5sZW5ndGggLSAxXG4gICAgICAgIF07XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuXG4gIHByaXZhdGUgc2hvd1RleHRTZWxlY3Rpb25BY3Rpb24oKTpcbiAgICB2b2lkXG4gIHtcbiAgICBjb25zdCB2aWV3ID1cbiAgICAgIHRoaXMuYXBwLndvcmtzcGFjZVxuICAgICAgICAuZ2V0QWN0aXZlVmlld09mVHlwZShcbiAgICAgICAgICBNYXJrZG93blZpZXdcbiAgICAgICAgKTtcblxuICAgIGNvbnN0IGVkaXRvclNlbGVjdGlvbiA9XG4gICAgICB2aWV3Py5lZGl0b3IuZ2V0U2VsZWN0aW9uKClcbiAgICAgID8/IFwiXCI7XG5cbiAgICBjb25zdCBicm93c2VyU2VsZWN0aW9uID1cbiAgICAgIHdpbmRvdy5nZXRTZWxlY3Rpb24oKTtcblxuICAgIGNvbnN0IGRvbVNlbGVjdGlvbiA9XG4gICAgICBicm93c2VyU2VsZWN0aW9uPy50b1N0cmluZygpXG4gICAgICA/PyBcIlwiO1xuXG4gICAgY29uc3Qgc2VsZWN0aW9uVG91Y2hlc1RpdGxlID1cbiAgICAgIFtcbiAgICAgICAgYnJvd3NlclNlbGVjdGlvbj8uYW5jaG9yTm9kZSxcbiAgICAgICAgYnJvd3NlclNlbGVjdGlvbj8uZm9jdXNOb2RlXG4gICAgICBdLnNvbWUoKG5vZGUpID0+IHtcbiAgICAgICAgY29uc3QgZWxlbWVudCA9XG4gICAgICAgICAgbm9kZSBpbnN0YW5jZW9mIEVsZW1lbnRcbiAgICAgICAgICAgID8gbm9kZVxuICAgICAgICAgICAgOiBub2RlPy5wYXJlbnRFbGVtZW50O1xuXG4gICAgICAgIHJldHVybiBCb29sZWFuKFxuICAgICAgICAgIGVsZW1lbnQ/LmNsb3Nlc3QoXG4gICAgICAgICAgICBcIi5pbmxpbmUtdGl0bGUsIC52aWV3LWhlYWRlci10aXRsZVwiXG4gICAgICAgICAgKVxuICAgICAgICApO1xuICAgICAgfSk7XG5cbiAgICBjb25zdCBzZWxlY3RlZFRleHQgPVxuICAgICAgc2VsZWN0aW9uVG91Y2hlc1RpdGxlXG4gICAgICAgICYmIGRvbVNlbGVjdGlvbi50cmltKCkubGVuZ3RoID4gMFxuICAgICAgICA/IGRvbVNlbGVjdGlvblxuICAgICAgICA6IGVkaXRvclNlbGVjdGlvbi50cmltKCkubGVuZ3RoID4gMFxuICAgICAgICAgID8gZWRpdG9yU2VsZWN0aW9uXG4gICAgICAgICAgOiBkb21TZWxlY3Rpb247XG5cbiAgICBpZiAoXG4gICAgICBzZWxlY3RlZFRleHQudHJpbSgpLmxlbmd0aCA9PT0gMFxuICAgICkge1xuICAgICAgdGhpcy5oaWRlRmxvYXRpbmdBY3Rpb24oKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBhbmNob3JSZWN0ID1cbiAgICAgIHRoaXMuZ2V0U2VsZWN0aW9uQW5jaG9yUmVjdChcbiAgICAgICAgdmlld1xuICAgICAgKTtcblxuICAgIGlmICghYW5jaG9yUmVjdCkge1xuICAgICAgdGhpcy5oaWRlRmxvYXRpbmdBY3Rpb24oKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBhY3RpdmVGaWxlID1cbiAgICAgIHZpZXc/LmZpbGVcbiAgICAgID8/IHRoaXMuYXBwLndvcmtzcGFjZS5nZXRBY3RpdmVGaWxlKCk7XG5cbiAgICAvKlxuICAgICBEcmFmdGF2YS1zdHlsZSBwb3NpdGlvbjpcbiAgICAgYWxpZ25lZCB0byB0aGUgZW5kIG9mIHRoZSBzZWxlY3RlZCB0ZXh0IGFuZFxuICAgICBzbGlnaHRseSBhYm92ZSBpdCB3aGVuIHJvb20gaXMgYXZhaWxhYmxlLlxuICAgICAqL1xuICAgIGNvbnN0IHJlcXVlc3RlZFggPVxuICAgICAgYW5jaG9yUmVjdC5yaWdodCAtIDY4O1xuXG4gICAgY29uc3QgcmVxdWVzdGVkWSA9XG4gICAgICBhbmNob3JSZWN0LnRvcCA+PSAzOFxuICAgICAgICA/IGFuY2hvclJlY3QudG9wIC0gMzZcbiAgICAgICAgOiBhbmNob3JSZWN0LmJvdHRvbSArIDY7XG5cbiAgICB0aGlzLnNob3dGbG9hdGluZ0FjdGlvbihcbiAgICAgIHJlcXVlc3RlZFgsXG4gICAgICByZXF1ZXN0ZWRZLFxuICAgICAgKCkgPT4ge1xuICAgICAgICB0aGlzLnNlbmRQYXlsb2FkKFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBraW5kOiBcInNlbGVjdGlvblwiLFxuICAgICAgICAgICAgY29udGVudDogc2VsZWN0ZWRUZXh0LFxuICAgICAgICAgICAgc291cmNlVGl0bGU6XG4gICAgICAgICAgICAgIGFjdGl2ZUZpbGU/LmJhc2VuYW1lLFxuICAgICAgICAgICAgc291cmNlUGF0aDpcbiAgICAgICAgICAgICAgYWN0aXZlRmlsZT8ucGF0aFxuICAgICAgICAgIH1cbiAgICAgICAgXSk7XG4gICAgICB9XG4gICAgKTtcbiAgfVxuXG5cbiAgcHJpdmF0ZSBzaG93SW1hZ2VDYXB0dXJlQWN0aW9uKFxuICAgIGltYWdlOiBIVE1MSW1hZ2VFbGVtZW50LFxuICAgIGNsaWNrWDogbnVtYmVyLFxuICAgIGNsaWNrWTogbnVtYmVyXG4gICk6IHZvaWRcbiAge1xuICAgIC8qXG4gICAgIFBvc2l0aW9uIHRoZSBjYXBzdWxlIG5leHQgdG8gdGhlIGNsaWNrIHJhdGhlclxuICAgICB0aGFuIGluIGEgZml4ZWQgaW1hZ2UgY29ybmVyLiBUaGlzIGF2b2lkc1xuICAgICBPYnNpZGlhbidzIG93biB6b29tL3NvdXJjZSBjb250cm9scyBhbmQgcmVzaXplXG4gICAgIGhhbmRsZS5cbiAgICAgKi9cbiAgICBjb25zdCByZXF1ZXN0ZWRYID1cbiAgICAgIGNsaWNrWCAtIDM0O1xuXG4gICAgY29uc3QgcmVxdWVzdGVkWSA9XG4gICAgICBjbGlja1kgPj0gNDBcbiAgICAgICAgPyBjbGlja1kgLSAzOFxuICAgICAgICA6IGNsaWNrWSArIDEwO1xuXG4gICAgdGhpcy5zaG93RmxvYXRpbmdBY3Rpb24oXG4gICAgICByZXF1ZXN0ZWRYLFxuICAgICAgcmVxdWVzdGVkWSxcbiAgICAgICgpID0+IHtcbiAgICAgICAgdm9pZCB0aGlzLnNlbmRDbGlja2VkSW1hZ2UoXG4gICAgICAgICAgaW1hZ2VcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICApO1xuICB9XG5cblxuICBwcml2YXRlIGFzeW5jIHNlbmRDbGlja2VkSW1hZ2UoXG4gICAgaW1hZ2U6IEhUTUxJbWFnZUVsZW1lbnRcbiAgKTogUHJvbWlzZTx2b2lkPlxuICB7XG4gICAgY29uc3Qgc291cmNlQ2FuZGlkYXRlcyA9XG4gICAgICBbXG4gICAgICAgIGltYWdlLmN1cnJlbnRTcmMsXG4gICAgICAgIGltYWdlLmdldEF0dHJpYnV0ZShcInNyY1wiKSxcbiAgICAgICAgaW1hZ2UuZ2V0QXR0cmlidXRlKFwiZGF0YS1zcmNcIilcbiAgICAgIF1cbiAgICAgIC5maWx0ZXIoXG4gICAgICAgICh2YWx1ZSk6IHZhbHVlIGlzIHN0cmluZyA9PlxuICAgICAgICAgIEJvb2xlYW4odmFsdWUpXG4gICAgICApO1xuXG4gICAgY29uc3QgcmVtb3RlU291cmNlID1cbiAgICAgIHNvdXJjZUNhbmRpZGF0ZXMuZmluZChcbiAgICAgICAgKHZhbHVlKSA9PlxuICAgICAgICAgIHZhbHVlLnN0YXJ0c1dpdGgoXCJodHRwczovL1wiKVxuICAgICAgICAgIHx8IHZhbHVlLnN0YXJ0c1dpdGgoXCJodHRwOi8vXCIpXG4gICAgICApO1xuXG4gICAgbGV0IGlkZWE6XG4gICAgICBDYXB0dXJlSWRlYSB8IG51bGwgPVxuICAgICAgICBudWxsO1xuXG4gICAgaWYgKHJlbW90ZVNvdXJjZSkge1xuICAgICAgaWRlYSA9XG4gICAgICAgIGF3YWl0IHRoaXMuaWRlYUZyb21SZW1vdGVJbWFnZShcbiAgICAgICAgICByZW1vdGVTb3VyY2VcbiAgICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgZmlsZSA9XG4gICAgICAgIHRoaXMucmVzb2x2ZUltYWdlRmlsZUZyb21FbGVtZW50KFxuICAgICAgICAgIGltYWdlLFxuICAgICAgICAgIHNvdXJjZUNhbmRpZGF0ZXNcbiAgICAgICAgKTtcblxuICAgICAgaWYgKCFmaWxlKSB7XG4gICAgICAgIG5ldyBOb3RpY2UoXG4gICAgICAgICAgXCJDb3VsZCBub3QgbG9jYXRlIGltYWdlIGluIHZhdWx0XCJcbiAgICAgICAgKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZGVhID1cbiAgICAgICAgYXdhaXQgdGhpcy5pZGVhRnJvbUltYWdlRmlsZShcbiAgICAgICAgICBmaWxlXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgaWYgKGlkZWEpIHtcbiAgICAgIHRoaXMuc2VuZFBheWxvYWQoW1xuICAgICAgICBpZGVhXG4gICAgICBdKTtcbiAgICB9XG4gIH1cblxuXG4gIHByaXZhdGUgcmVzb2x2ZUltYWdlRmlsZUZyb21FbGVtZW50KFxuICAgIGltYWdlOiBIVE1MSW1hZ2VFbGVtZW50LFxuICAgIHNvdXJjZUNhbmRpZGF0ZXM6IHN0cmluZ1tdXG4gICk6IFRGaWxlIHwgbnVsbFxuICB7XG4gICAgY29uc3QgY2FuZGlkYXRlczpcbiAgICAgIHN0cmluZ1tdID0gW107XG5cbiAgICBjb25zdCBhZGRDYW5kaWRhdGUgPVxuICAgICAgKFxuICAgICAgICByYXc6XG4gICAgICAgICAgc3RyaW5nIHwgbnVsbCB8IHVuZGVmaW5lZFxuICAgICAgKSA9PiB7XG4gICAgICAgIGlmICghcmF3KSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IHZhbHVlID0gcmF3O1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgdmFsdWUgPVxuICAgICAgICAgICAgZGVjb2RlVVJJQ29tcG9uZW50KFxuICAgICAgICAgICAgICB2YWx1ZVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgLy8gS2VlcCBvcmlnaW5hbCB2YWx1ZS5cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHF1ZXJ5SW5kZXggPVxuICAgICAgICAgIHZhbHVlLmluZGV4T2YoXCI/XCIpO1xuXG4gICAgICAgIGlmIChxdWVyeUluZGV4ID49IDApIHtcbiAgICAgICAgICB2YWx1ZSA9XG4gICAgICAgICAgICB2YWx1ZS5zdWJzdHJpbmcoXG4gICAgICAgICAgICAgIDAsXG4gICAgICAgICAgICAgIHF1ZXJ5SW5kZXhcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBoYXNoSW5kZXggPVxuICAgICAgICAgIHZhbHVlLmluZGV4T2YoXCIjXCIpO1xuXG4gICAgICAgIGlmIChoYXNoSW5kZXggPj0gMCkge1xuICAgICAgICAgIHZhbHVlID1cbiAgICAgICAgICAgIHZhbHVlLnN1YnN0cmluZyhcbiAgICAgICAgICAgICAgMCxcbiAgICAgICAgICAgICAgaGFzaEluZGV4XG4gICAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgY2FuZGlkYXRlcy5wdXNoKHZhbHVlKTtcbiAgICAgIH07XG5cbiAgICBmb3IgKFxuICAgICAgY29uc3Qgc291cmNlXG4gICAgICBvZiBzb3VyY2VDYW5kaWRhdGVzXG4gICAgKSB7XG4gICAgICBhZGRDYW5kaWRhdGUoc291cmNlKTtcbiAgICB9XG5cbiAgICBhZGRDYW5kaWRhdGUoXG4gICAgICBpbWFnZS5nZXRBdHRyaWJ1dGUoXCJkYXRhLXBhdGhcIilcbiAgICApO1xuXG4gICAgYWRkQ2FuZGlkYXRlKFxuICAgICAgaW1hZ2UuZ2V0QXR0cmlidXRlKFwiYWx0XCIpXG4gICAgKTtcblxuICAgIGNvbnN0IGltYWdlRmlsZXMgPVxuICAgICAgdGhpcy5hcHAudmF1bHRcbiAgICAgICAgLmdldEZpbGVzKClcbiAgICAgICAgLmZpbHRlcihcbiAgICAgICAgICAoZmlsZSkgPT5cbiAgICAgICAgICAgIHRoaXMuaXNTdXBwb3J0ZWRJbWFnZUZpbGUoXG4gICAgICAgICAgICAgIGZpbGVcbiAgICAgICAgICAgIClcbiAgICAgICAgKTtcblxuICAgIC8qXG4gICAgIFByZWZlciBleGFjdC9mdWxsLXBhdGggcmVzb2x1dGlvbi5cbiAgICAgKi9cbiAgICBmb3IgKFxuICAgICAgY29uc3QgY2FuZGlkYXRlXG4gICAgICBvZiBjYW5kaWRhdGVzXG4gICAgKSB7XG4gICAgICBmb3IgKFxuICAgICAgICBjb25zdCBmaWxlXG4gICAgICAgIG9mIGltYWdlRmlsZXNcbiAgICAgICkge1xuICAgICAgICBpZiAoXG4gICAgICAgICAgY2FuZGlkYXRlID09PSBmaWxlLnBhdGhcbiAgICAgICAgICB8fCBjYW5kaWRhdGUuZW5kc1dpdGgoXG4gICAgICAgICAgICBcIi9cIiArIGZpbGUucGF0aFxuICAgICAgICAgIClcbiAgICAgICAgICB8fCBjYW5kaWRhdGUuZW5kc1dpdGgoXG4gICAgICAgICAgICBmaWxlLnBhdGhcbiAgICAgICAgICApXG4gICAgICAgICkge1xuICAgICAgICAgIHJldHVybiBmaWxlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLypcbiAgICAgRmlsZW5hbWUgZmFsbGJhY2sgb25seSB3aGVuIHRoZXJlIGlzIGV4YWN0bHlcbiAgICAgb25lIG1hdGNoaW5nIGltYWdlIGluIHRoZSB2YXVsdC5cbiAgICAgKi9cbiAgICBmb3IgKFxuICAgICAgY29uc3QgY2FuZGlkYXRlXG4gICAgICBvZiBjYW5kaWRhdGVzXG4gICAgKSB7XG4gICAgICBjb25zdCBmaWxlbmFtZSA9XG4gICAgICAgIGNhbmRpZGF0ZVxuICAgICAgICAgIC5zcGxpdChcIi9cIilcbiAgICAgICAgICAuZmlsdGVyKEJvb2xlYW4pXG4gICAgICAgICAgLnBvcCgpO1xuXG4gICAgICBpZiAoIWZpbGVuYW1lKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBtYXRjaGVzID1cbiAgICAgICAgaW1hZ2VGaWxlcy5maWx0ZXIoXG4gICAgICAgICAgKGZpbGUpID0+XG4gICAgICAgICAgICBmaWxlLm5hbWUgPT09IGZpbGVuYW1lXG4gICAgICAgICk7XG5cbiAgICAgIGlmIChtYXRjaGVzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICByZXR1cm4gbWF0Y2hlc1swXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG5cbiAgcHJpdmF0ZSBzaG93RmxvYXRpbmdBY3Rpb24oXG4gICAgcmVxdWVzdGVkWDogbnVtYmVyLFxuICAgIHJlcXVlc3RlZFk6IG51bWJlcixcbiAgICBhY3Rpb246ICgpID0+IHZvaWRcbiAgKTogdm9pZFxuICB7XG4gICAgdGhpcy5oaWRlRmxvYXRpbmdBY3Rpb24oKTtcblxuICAgIGNvbnN0IGJ1dHRvbiA9XG4gICAgICBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFxuICAgICAgICBcImJ1dHRvblwiXG4gICAgICApO1xuXG4gICAgYnV0dG9uLnR5cGUgPVxuICAgICAgXCJidXR0b25cIjtcblxuICAgIGJ1dHRvbi5jbGFzc05hbWUgPVxuICAgICAgXCJpbnpydC1jYXB0dXJlLWJ1YmJsZVwiO1xuXG4gICAgYnV0dG9uLnNldEF0dHJpYnV0ZShcbiAgICAgIFwiYXJpYS1sYWJlbFwiLFxuICAgICAgXCJTZW5kIHRvIERyYWZ0YXZhXCJcbiAgICApO1xuXG4gICAgY29uc3QgaWNvbiA9XG4gICAgICBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFxuICAgICAgICBcInNwYW5cIlxuICAgICAgKTtcblxuICAgIGljb24uY2xhc3NOYW1lID1cbiAgICAgIFwiaW56cnQtY2FwdHVyZS1idWJibGUtaWNvblwiO1xuXG4gICAgc2V0SWNvbihcbiAgICAgIGljb24sXG4gICAgICBcInNlbmRcIlxuICAgICk7XG5cbiAgICBjb25zdCBsYWJlbCA9XG4gICAgICBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFxuICAgICAgICBcInNwYW5cIlxuICAgICAgKTtcblxuICAgIGxhYmVsLmNsYXNzTmFtZSA9XG4gICAgICBcImluenJ0LWNhcHR1cmUtYnViYmxlLWxhYmVsXCI7XG5cbiAgICBsYWJlbC50ZXh0Q29udGVudCA9XG4gICAgICBcIkRyYWZ0YXZhXCI7XG5cbiAgICBidXR0b24uYXBwZW5kQ2hpbGQoXG4gICAgICBpY29uXG4gICAgKTtcblxuICAgIGJ1dHRvbi5hcHBlbmRDaGlsZChcbiAgICAgIGxhYmVsXG4gICAgKTtcblxuICAgIGJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFxuICAgICAgXCJwb2ludGVyZG93blwiLFxuICAgICAgKGV2ZW50KSA9PiB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgfVxuICAgICk7XG5cbiAgICBidXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgIFwiY2xpY2tcIixcbiAgICAgIChldmVudCkgPT4ge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcblxuICAgICAgICB0aGlzLmhpZGVGbG9hdGluZ0FjdGlvbigpO1xuXG4gICAgICAgIGFjdGlvbigpO1xuICAgICAgfVxuICAgICk7XG5cbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKFxuICAgICAgYnV0dG9uXG4gICAgKTtcblxuICAgIHRoaXMuZmxvYXRpbmdBY3Rpb25FbCA9XG4gICAgICBidXR0b247XG5cbiAgICBjb25zdCByZWN0ID1cbiAgICAgIGJ1dHRvbi5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblxuICAgIGNvbnN0IG1hcmdpbiA9XG4gICAgICA4O1xuXG4gICAgY29uc3QgeCA9XG4gICAgICBNYXRoLm1heChcbiAgICAgICAgbWFyZ2luLFxuICAgICAgICBNYXRoLm1pbihcbiAgICAgICAgICByZXF1ZXN0ZWRYLFxuICAgICAgICAgIHdpbmRvdy5pbm5lcldpZHRoXG4gICAgICAgICAgICAtIHJlY3Qud2lkdGhcbiAgICAgICAgICAgIC0gbWFyZ2luXG4gICAgICAgIClcbiAgICAgICk7XG5cbiAgICBjb25zdCB5ID1cbiAgICAgIE1hdGgubWF4KFxuICAgICAgICBtYXJnaW4sXG4gICAgICAgIE1hdGgubWluKFxuICAgICAgICAgIHJlcXVlc3RlZFksXG4gICAgICAgICAgd2luZG93LmlubmVySGVpZ2h0XG4gICAgICAgICAgICAtIHJlY3QuaGVpZ2h0XG4gICAgICAgICAgICAtIG1hcmdpblxuICAgICAgICApXG4gICAgICApO1xuXG4gICAgYnV0dG9uLnN0eWxlLmxlZnQgPVxuICAgICAgYCR7eH1weGA7XG5cbiAgICBidXR0b24uc3R5bGUudG9wID1cbiAgICAgIGAke3l9cHhgO1xuICB9XG5cblxuICBwcml2YXRlIGhpZGVGbG9hdGluZ0FjdGlvbigpOlxuICAgIHZvaWRcbiAge1xuICAgIHRoaXMuZmxvYXRpbmdBY3Rpb25FbFxuICAgICAgPy5yZW1vdmUoKTtcblxuICAgIHRoaXMuZmxvYXRpbmdBY3Rpb25FbCA9XG4gICAgICBudWxsO1xuICB9XG5cblxuICBwcml2YXRlIGlzU3VwcG9ydGVkSW1hZ2VGaWxlKFxuICAgIGZpbGU6IFRGaWxlXG4gICk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBbXG4gICAgICBcInBuZ1wiLFxuICAgICAgXCJqcGdcIixcbiAgICAgIFwianBlZ1wiLFxuICAgICAgXCJ3ZWJwXCIsXG4gICAgICBcImdpZlwiLFxuICAgICAgXCJoZWljXCIsXG4gICAgICBcImhlaWZcIixcbiAgICAgIFwidGlmXCIsXG4gICAgICBcInRpZmZcIlxuICAgIF0uaW5jbHVkZXMoXG4gICAgICBmaWxlLmV4dGVuc2lvblxuICAgICAgICAudG9Mb3dlckNhc2UoKVxuICAgICk7XG4gIH1cblxuXG4gIHByaXZhdGUgbWltZVR5cGVGb3JFeHRlbnNpb24oXG4gICAgZXh0ZW5zaW9uOiBzdHJpbmdcbiAgKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgICBzd2l0Y2ggKFxuICAgICAgZXh0ZW5zaW9uLnRvTG93ZXJDYXNlKClcbiAgICApIHtcbiAgICAgIGNhc2UgXCJwbmdcIjpcbiAgICAgICAgcmV0dXJuIFwiaW1hZ2UvcG5nXCI7XG5cbiAgICAgIGNhc2UgXCJqcGdcIjpcbiAgICAgIGNhc2UgXCJqcGVnXCI6XG4gICAgICAgIHJldHVybiBcImltYWdlL2pwZWdcIjtcblxuICAgICAgY2FzZSBcIndlYnBcIjpcbiAgICAgICAgcmV0dXJuIFwiaW1hZ2Uvd2VicFwiO1xuXG4gICAgICBjYXNlIFwiZ2lmXCI6XG4gICAgICAgIHJldHVybiBcImltYWdlL2dpZlwiO1xuXG4gICAgICBjYXNlIFwiaGVpY1wiOlxuICAgICAgICByZXR1cm4gXCJpbWFnZS9oZWljXCI7XG5cbiAgICAgIGNhc2UgXCJoZWlmXCI6XG4gICAgICAgIHJldHVybiBcImltYWdlL2hlaWZcIjtcblxuICAgICAgY2FzZSBcInRpZlwiOlxuICAgICAgY2FzZSBcInRpZmZcIjpcbiAgICAgICAgcmV0dXJuIFwiaW1hZ2UvdGlmZlwiO1xuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG5cbiAgcHJpdmF0ZSBhc3luYyBpZGVhRnJvbUltYWdlRmlsZShcbiAgICBmaWxlOiBURmlsZVxuICApOiBQcm9taXNlPENhcHR1cmVJZGVhIHwgbnVsbD4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBkYXRhID1cbiAgICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHRcbiAgICAgICAgICAucmVhZEJpbmFyeShcbiAgICAgICAgICAgIGZpbGVcbiAgICAgICAgICApO1xuXG4gICAgICBpZiAoXG4gICAgICAgIGRhdGEuYnl0ZUxlbmd0aCA9PT0gMFxuICAgICAgKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBcIkltYWdlIGZpbGUgaXMgZW1wdHlcIlxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBraW5kOlxuICAgICAgICAgIFwiaW1hZ2VcIixcblxuICAgICAgICBpbWFnZToge1xuICAgICAgICAgIGRhdGFCYXNlNjQ6XG4gICAgICAgICAgICBCdWZmZXJcbiAgICAgICAgICAgICAgLmZyb20oZGF0YSlcbiAgICAgICAgICAgICAgLnRvU3RyaW5nKFxuICAgICAgICAgICAgICAgIFwiYmFzZTY0XCJcbiAgICAgICAgICAgICAgKSxcblxuICAgICAgICAgIG1pbWVUeXBlOlxuICAgICAgICAgICAgdGhpcy5taW1lVHlwZUZvckV4dGVuc2lvbihcbiAgICAgICAgICAgICAgZmlsZS5leHRlbnNpb25cbiAgICAgICAgICAgICksXG5cbiAgICAgICAgICBvcmlnaW5hbEZpbGVOYW1lOlxuICAgICAgICAgICAgZmlsZS5uYW1lXG4gICAgICAgIH0sXG5cbiAgICAgICAgc291cmNlVGl0bGU6XG4gICAgICAgICAgZmlsZS5iYXNlbmFtZSxcblxuICAgICAgICBzb3VyY2VQYXRoOlxuICAgICAgICAgIGZpbGUucGF0aFxuICAgICAgfTtcbiAgICB9IGNhdGNoIChcbiAgICAgIGVycm9yXG4gICAgKSB7XG4gICAgICBjb25zb2xlLmVycm9yKFxuICAgICAgICBcIltEcmFmdGF2YSBDb21wYW5pb25dIGxvY2FsIGltYWdlIHJlYWQgZmFpbGVkOlwiLFxuICAgICAgICBlcnJvclxuICAgICAgKTtcblxuICAgICAgbmV3IE5vdGljZShcbiAgICAgICAgXCJDb3VsZCBub3QgcmVhZCBpbWFnZVwiXG4gICAgICApO1xuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuXG4gIHByaXZhdGUgYXN5bmMgaWRlYUZyb21SZW1vdGVJbWFnZShcbiAgICByYXdVcmw6IHN0cmluZ1xuICApOiBQcm9taXNlPENhcHR1cmVJZGVhIHwgbnVsbD4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXNwb25zZSA9XG4gICAgICAgIGF3YWl0IHJlcXVlc3RVcmwoe1xuICAgICAgICAgIHVybDpcbiAgICAgICAgICAgIHJhd1VybCxcblxuICAgICAgICAgIG1ldGhvZDpcbiAgICAgICAgICAgIFwiR0VUXCIsXG5cbiAgICAgICAgICB0aHJvdzpcbiAgICAgICAgICAgIGZhbHNlXG4gICAgICAgIH0pO1xuXG4gICAgICBpZiAoXG4gICAgICAgIHJlc3BvbnNlLnN0YXR1cyA8IDIwMFxuICAgICAgICB8fFxuICAgICAgICByZXNwb25zZS5zdGF0dXMgPj0gMzAwXG4gICAgICApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBIVFRQICR7cmVzcG9uc2Uuc3RhdHVzfWBcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgaWYgKFxuICAgICAgICByZXNwb25zZS5hcnJheUJ1ZmZlci5ieXRlTGVuZ3RoXG4gICAgICAgICAgPT09IDBcbiAgICAgICkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgXCJEb3dubG9hZGVkIGltYWdlIGlzIGVtcHR5XCJcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgY29udGVudFR5cGVFbnRyeSA9XG4gICAgICAgIE9iamVjdC5lbnRyaWVzKFxuICAgICAgICAgIHJlc3BvbnNlLmhlYWRlcnNcbiAgICAgICAgKVxuICAgICAgICAuZmluZChcbiAgICAgICAgICAoW2tleV0pID0+XG4gICAgICAgICAgICBrZXkudG9Mb3dlckNhc2UoKVxuICAgICAgICAgICAgICA9PT0gXCJjb250ZW50LXR5cGVcIlxuICAgICAgICApO1xuXG4gICAgICBjb25zdCByZXNwb25zZU1pbWVUeXBlID1cbiAgICAgICAgY29udGVudFR5cGVFbnRyeVxuICAgICAgICAgID8gU3RyaW5nKFxuICAgICAgICAgICAgICBjb250ZW50VHlwZUVudHJ5WzFdXG4gICAgICAgICAgICApXG4gICAgICAgICAgICAuc3BsaXQoXCI7XCIpWzBdXG4gICAgICAgICAgICAudHJpbSgpXG4gICAgICAgICAgOiB1bmRlZmluZWQ7XG5cbiAgICAgIGNvbnN0IHBhcnNlZCA9XG4gICAgICAgIG5ldyBVUkwoXG4gICAgICAgICAgcmF3VXJsXG4gICAgICAgICk7XG5cbiAgICAgIGNvbnN0IHJhd0ZpbGVOYW1lID1cbiAgICAgICAgcGFyc2VkLnBhdGhuYW1lXG4gICAgICAgICAgLnNwbGl0KFwiL1wiKVxuICAgICAgICAgIC5maWx0ZXIoQm9vbGVhbilcbiAgICAgICAgICAucG9wKCk7XG5cbiAgICAgIGNvbnN0IG9yaWdpbmFsRmlsZU5hbWUgPVxuICAgICAgICByYXdGaWxlTmFtZVxuICAgICAgICAgID8gZGVjb2RlVVJJQ29tcG9uZW50KFxuICAgICAgICAgICAgICByYXdGaWxlTmFtZVxuICAgICAgICAgICAgKVxuICAgICAgICAgIDogdW5kZWZpbmVkO1xuXG4gICAgICBjb25zdCBleHRlbnNpb24gPVxuICAgICAgICBvcmlnaW5hbEZpbGVOYW1lXG4gICAgICAgICAgPy5zcGxpdChcIi5cIilcbiAgICAgICAgICAucG9wKClcbiAgICAgICAgICA/LnRvTG93ZXJDYXNlKCk7XG5cbiAgICAgIGNvbnN0IG1pbWVUeXBlID1cbiAgICAgICAgcmVzcG9uc2VNaW1lVHlwZVxuICAgICAgICAgID8udG9Mb3dlckNhc2UoKVxuICAgICAgICAgIC5zdGFydHNXaXRoKFxuICAgICAgICAgICAgXCJpbWFnZS9cIlxuICAgICAgICAgIClcbiAgICAgICAgICA/IHJlc3BvbnNlTWltZVR5cGVcbiAgICAgICAgICA6IGV4dGVuc2lvblxuICAgICAgICAgICAgPyB0aGlzXG4gICAgICAgICAgICAgICAgLm1pbWVUeXBlRm9yRXh0ZW5zaW9uKFxuICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uXG4gICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgOiB1bmRlZmluZWQ7XG5cbiAgICAgIGlmIChcbiAgICAgICAgIW1pbWVUeXBlXG4gICAgICApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIFwiRG93bmxvYWRlZCByZXNvdXJjZSBpcyBub3QgYSBzdXBwb3J0ZWQgaW1hZ2VcIlxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBraW5kOlxuICAgICAgICAgIFwiaW1hZ2VcIixcblxuICAgICAgICBpbWFnZToge1xuICAgICAgICAgIGRhdGFCYXNlNjQ6XG4gICAgICAgICAgICBCdWZmZXJcbiAgICAgICAgICAgICAgLmZyb20oXG4gICAgICAgICAgICAgICAgcmVzcG9uc2UuYXJyYXlCdWZmZXJcbiAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAudG9TdHJpbmcoXG4gICAgICAgICAgICAgICAgXCJiYXNlNjRcIlxuICAgICAgICAgICAgICApLFxuXG4gICAgICAgICAgbWltZVR5cGUsXG5cbiAgICAgICAgICBvcmlnaW5hbEZpbGVOYW1lXG4gICAgICAgIH0sXG5cbiAgICAgICAgc291cmNlVGl0bGU6XG4gICAgICAgICAgb3JpZ2luYWxGaWxlTmFtZSxcblxuICAgICAgICBzb3VyY2VQYXRoOlxuICAgICAgICAgIHJhd1VybFxuICAgICAgfTtcbiAgICB9IGNhdGNoIChcbiAgICAgIGVycm9yXG4gICAgKSB7XG4gICAgICBjb25zb2xlLmVycm9yKFxuICAgICAgICBcIltEcmFmdGF2YSBDb21wYW5pb25dIHJlbW90ZSBpbWFnZSBkb3dubG9hZCBmYWlsZWQ6XCIsXG4gICAgICAgIGVycm9yXG4gICAgICApO1xuXG4gICAgICBuZXcgTm90aWNlKFxuICAgICAgICBcIkNvdWxkIG5vdCBkb3dubG9hZCBpbWFnZVwiXG4gICAgICApO1xuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuXG4gIHByaXZhdGUgYXN5bmMgaWRlYUZyb21GaWxlKFxuICAgIGZpbGU6IFRGaWxlXG4gICk6IFByb21pc2U8Q2FwdHVyZUlkZWE+IHtcbiAgICBjb25zdCBtYXJrZG93biA9XG4gICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdFxuICAgICAgICAuY2FjaGVkUmVhZChmaWxlKTtcblxuICAgIC8qXG4gICAgIEVtcHR5L3RpdGxlLW9ubHkgbm90ZTpcbiAgICAgZmlsZW5hbWUgYmVjb21lcyB0aGUgSWRlYS5cblxuICAgICBPdGhlcndpc2UgcHJlc2VydmUgdGhlIG5vdGUgYm9keSBleGFjdGx5LlxuICAgICovXG4gICAgY29uc3QgY29udGVudCA9XG4gICAgICBtYXJrZG93bi50cmltKCkubGVuZ3RoID4gMFxuICAgICAgICA/IG1hcmtkb3duXG4gICAgICAgIDogZmlsZS5iYXNlbmFtZTtcblxuICAgIHJldHVybiB7XG4gICAgICBraW5kOlxuICAgICAgICBcIm5vdGVcIixcblxuICAgICAgY29udGVudCxcblxuICAgICAgc291cmNlVGl0bGU6XG4gICAgICAgIGZpbGUuYmFzZW5hbWUsXG5cbiAgICAgIHNvdXJjZVBhdGg6XG4gICAgICAgIGZpbGUucGF0aFxuICAgIH07XG4gIH1cblxuXG4gIHByaXZhdGUgc2hvd0RyYWZ0YXZhVW5hdmFpbGFibGVOb3RpY2UoKTogdm9pZCB7XG4gICAgY29uc3Qgbm90aWNlID0gbmV3IE5vdGljZShcIlwiLCAxMjAwMCk7XG5cbiAgICBub3RpY2UubWVzc2FnZUVsLnRleHRDb250ZW50ID1cbiAgICAgIFwiRHJhZnRhdmEgYXBwIGlzIG5vdCBhdmFpbGFibGUuIFwiO1xuXG4gICAgY29uc3QgbGluayA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJhXCIpO1xuICAgIGxpbmsudGV4dENvbnRlbnQgPSBcIkdldCBEcmFmdGF2YVwiO1xuICAgIGxpbmsuaHJlZiA9IERSQUZUQVZBX1dFQlNJVEU7XG4gICAgbGluay50YXJnZXQgPSBcIl9ibGFua1wiO1xuICAgIGxpbmsucmVsID0gXCJub29wZW5lciBub3JlZmVycmVyXCI7XG5cbiAgICBub3RpY2UubWVzc2FnZUVsLmFwcGVuZENoaWxkKGxpbmspO1xuICB9XG5cblxuICBwcml2YXRlIGRpc3BhdGNoQ2FwdHVyZUZpbGUoXG4gICAgY2FwdHVyZVBhdGg6IHN0cmluZyxcbiAgICBpZGVhQ291bnQ6IG51bWJlclxuICApOiB2b2lkIHtcbiAgICBjb25zdCBzY3JpcHQgPSBbXG4gICAgICAnT2JqQy5pbXBvcnQoXCJBcHBLaXRcIik7JyxcbiAgICAgICd2YXIgYXBwcyA9ICQuTlNXb3Jrc3BhY2Uuc2hhcmVkV29ya3NwYWNlLnJ1bm5pbmdBcHBsaWNhdGlvbnM7JyxcbiAgICAgICd2YXIgbWF0Y2hlcyA9IFtdOycsXG4gICAgICAnZm9yICh2YXIgaSA9IDA7IGkgPCBhcHBzLmNvdW50OyBpKyspIHsnLFxuICAgICAgJyAgdmFyIGFwcCA9IGFwcHMub2JqZWN0QXRJbmRleChpKTsnLFxuICAgICAgJyAgdmFyIGlkZW50aWZpZXIgPSBhcHAuYnVuZGxlSWRlbnRpZmllcjsnLFxuICAgICAgJyAgaWYgKGlkZW50aWZpZXIgJiYgT2JqQy51bndyYXAoaWRlbnRpZmllcikgPT09IFwiY29tLmxvY2FsLmluenJ0XCIpIHsnLFxuICAgICAgJyAgICB2YXIgdXJsID0gYXBwLmJ1bmRsZVVSTDsnLFxuICAgICAgJyAgICBpZiAodXJsKSBtYXRjaGVzLnB1c2goT2JqQy51bndyYXAodXJsLnBhdGgpKTsnLFxuICAgICAgJyAgfScsXG4gICAgICAnfScsXG4gICAgICAnbWF0Y2hlcy5maW5kKGZ1bmN0aW9uKHBhdGgpIHsnLFxuICAgICAgJyAgcmV0dXJuIHBhdGggIT09IFwiL0FwcGxpY2F0aW9ucy9EcmFmdGF2YS5hcHBcIjsnLFxuICAgICAgJ30pIHx8IG1hdGNoZXNbMF0gfHwgXCJcIjsnXG4gICAgXS5qb2luKFwiXFxuXCIpO1xuXG4gICAgZXhlY0ZpbGUoXG4gICAgICBcIi91c3IvYmluL29zYXNjcmlwdFwiLFxuICAgICAgW1wiLWxcIiwgXCJKYXZhU2NyaXB0XCIsIFwiLWVcIiwgc2NyaXB0XSxcbiAgICAgIHsgdGltZW91dDogODAwMCB9LFxuICAgICAgKHByb2JlRXJyb3IsIHN0ZG91dCkgPT4ge1xuICAgICAgICBpZiAocHJvYmVFcnJvcikge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAgICAgICBcIltEcmFmdGF2YSBDb21wYW5pb25dIFJ1bm5pbmctYXBwIGxvb2t1cCBmYWlsZWQ6XCIsXG4gICAgICAgICAgICBwcm9iZUVycm9yXG4gICAgICAgICAgKTtcbiAgICAgICAgICBuZXcgTm90aWNlKFwiQ291bGQgbm90IGxvY2F0ZSBydW5uaW5nIERyYWZ0YXZhXCIpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHJ1bm5pbmdQYXRoID0gc3Rkb3V0LnRyaW0oKTtcbiAgICAgICAgY29uc3QgYXBwUGF0aCA9IHJ1bm5pbmdQYXRoIHx8IERFQlVHX0RSQUZUQVZBX0FQUDtcblxuICAgICAgICBpZiAoXG4gICAgICAgICAgIWFwcFBhdGguZW5kc1dpdGgoXCIuYXBwXCIpXG4gICAgICAgICAgfHwgIWV4aXN0c1N5bmMoYXBwUGF0aClcbiAgICAgICAgKSB7XG4gICAgICAgICAgdGhpcy5zaG93RHJhZnRhdmFVbmF2YWlsYWJsZU5vdGljZSgpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGV4ZWNGaWxlKFxuICAgICAgICAgIFwiL3Vzci9iaW4vb3BlblwiLFxuICAgICAgICAgIFtcIi1hXCIsIGFwcFBhdGgsIGNhcHR1cmVQYXRoXSxcbiAgICAgICAgICAoZXJyb3IpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFxuICAgICAgICAgICAgICAgIFwiW0RyYWZ0YXZhIENvbXBhbmlvbl0gb3BlbiBmYWlsZWQ6XCIsXG4gICAgICAgICAgICAgICAgZXJyb3JcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgbmV3IE5vdGljZShcIkNvdWxkIG5vdCBvcGVuIERyYWZ0YXZhXCIpO1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG5ldyBOb3RpY2UoXG4gICAgICAgICAgICAgIGlkZWFDb3VudCA9PT0gMVxuICAgICAgICAgICAgICAgID8gXCJTZW50IHRvIERyYWZ0YXZhXCJcbiAgICAgICAgICAgICAgICA6IGBTZW50ICR7aWRlYUNvdW50fSBJZGVhcyB0byBEcmFmdGF2YWBcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuICAgICAgICApO1xuICAgICAgfVxuICAgICk7XG4gIH1cblxuXG4gIHByaXZhdGUgc2VuZFBheWxvYWQoXG4gICAgaWRlYXM6IENhcHR1cmVJZGVhW11cbiAgKTogdm9pZCB7XG4gICAgaWYgKFxuICAgICAgaWRlYXMubGVuZ3RoID09PSAwXG4gICAgKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGRpcmVjdG9yeSA9XG4gICAgICAgIGpvaW4oXG4gICAgICAgICAgdG1wZGlyKCksXG4gICAgICAgICAgXCJpbnpydC1jb21wYW5pb25cIlxuICAgICAgICApO1xuXG4gICAgICBta2RpclN5bmMoXG4gICAgICAgIGRpcmVjdG9yeSxcbiAgICAgICAge1xuICAgICAgICAgIHJlY3Vyc2l2ZTpcbiAgICAgICAgICAgIHRydWVcbiAgICAgICAgfVxuICAgICAgKTtcblxuICAgICAgY29uc3QgY2FwdHVyZVBhdGggPVxuICAgICAgICBqb2luKFxuICAgICAgICAgIGRpcmVjdG9yeSxcbiAgICAgICAgICBgJHtyYW5kb21VVUlEKCl9LmluenJ0Y2FwdHVyZWBcbiAgICAgICAgKTtcblxuICAgICAgY29uc3QgZW52ZWxvcGU6XG4gICAgICAgIENhcHR1cmVFbnZlbG9wZSA9XG4gICAgICB7XG4gICAgICAgIHZlcnNpb246XG4gICAgICAgICAgMSxcblxuICAgICAgICBpZGVhc1xuICAgICAgfTtcblxuICAgICAgd3JpdGVGaWxlU3luYyhcbiAgICAgICAgY2FwdHVyZVBhdGgsXG4gICAgICAgIEpTT04uc3RyaW5naWZ5KFxuICAgICAgICAgIGVudmVsb3BlLFxuICAgICAgICAgIG51bGwsXG4gICAgICAgICAgMlxuICAgICAgICApLFxuICAgICAgICBcInV0ZjhcIlxuICAgICAgKTtcblxuICAgICAgdGhpcy5kaXNwYXRjaENhcHR1cmVGaWxlKFxuICAgICAgICBjYXB0dXJlUGF0aCxcbiAgICAgICAgaWRlYXMubGVuZ3RoXG4gICAgICApO1xuICAgIH0gY2F0Y2ggKFxuICAgICAgZXJyb3JcbiAgICApIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAgIFwiW0RyYWZ0YXZhIENvbXBhbmlvbl0gc2VuZCBmYWlsZWQ6XCIsXG4gICAgICAgIGVycm9yXG4gICAgICApO1xuXG4gICAgICBuZXcgTm90aWNlKFxuICAgICAgICBcIkNvdWxkIG5vdCBzZW5kIHRvIERyYWZ0YXZhXCJcbiAgICAgICk7XG4gICAgfVxuICB9XG59XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxzQkFTTztBQUVQLHlCQUVPO0FBRVAsZ0NBRU87QUFFUCx5QkFFTztBQUVQLHFCQUlPO0FBRVAscUJBRU87QUFFUCx1QkFFTztBQUdQLElBQU0scUJBQ0o7QUFFRixJQUFNLG1CQUNKO0FBNkJGLElBQXFCLDBCQUFyQixjQUNVLHVCQUNWO0FBQUEsRUFDVSxtQkFDZTtBQUFBLEVBRXZCLE1BQU0sU0FBd0I7QUFDNUIsU0FBSyx1QkFBdUI7QUFDNUIsU0FBSyxzQkFBc0I7QUFDM0IsU0FBSywrQkFBK0I7QUFFcEMsU0FBSyxXQUFXO0FBQUEsTUFDZCxJQUFJO0FBQUEsTUFDSixNQUFNO0FBQUEsTUFDTixVQUFVLE1BQU07QUFDZCxlQUFPO0FBQUEsVUFDTDtBQUFBLFVBQ0E7QUFBQSxVQUNBO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxJQUNGLENBQUM7QUFFRCxRQUFJO0FB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
