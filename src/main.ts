import {
  Menu,
  MarkdownView,
  Notice,
  Plugin,
  requestUrl,
  setIcon,
  TAbstractFile,
  TFile
} from "obsidian";

import {
  Buffer
} from "node:buffer";

import {
  execFile
} from "node:child_process";

import {
  randomUUID
} from "node:crypto";

import {
  existsSync,
  mkdirSync,
  writeFileSync
} from "node:fs";

import {
  tmpdir
} from "node:os";

import {
  join
} from "node:path";


const DEBUG_INZRT_APP =
  "/Applications/INZRT.app";


interface CaptureImage {
  dataBase64: string;
  mimeType?: string;
  originalFileName?: string;
}


interface CaptureIdea {
  kind:
    | "selection"
    | "note"
    | "image";

  content?: string;
  image?: CaptureImage;
  sourceTitle?: string;
  sourcePath?: string;
}


interface CaptureEnvelope {
  version: 1;
  ideas: CaptureIdea[];
}


export default class INZRTCompanionPlugin
  extends Plugin
{
  private floatingActionEl:
    HTMLElement | null = null;

  async onload(): Promise<void> {
    this.registerSingleFileMenu();
    this.registerMultiFileMenu();
    this.registerFloatingCaptureActions();

    new Notice(
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
  private runtimeWorkspace(): any {
    return this.app.workspace;
  }


  private registerSingleFileMenu():
    void
  {
    this.registerEvent(
      this.app.workspace.on(
        "file-menu",
        (
          menu: Menu,
          file: TAbstractFile
        ) => {
          if (
            !(file instanceof TFile)
          ) {
            return;
          }

          const isMarkdown =
            file.extension
              .toLowerCase()
              === "md";

          const isImage =
            this.isSupportedImageFile(
              file
            );

          if (
            !isMarkdown
            &&
            !isImage
          ) {
            return;
          }

          menu.addItem(
            (item) => {
              item
                .setTitle(
                  "Send to INZRT"
                )
                .setIcon("send")
                .onClick(
                  async () => {
                    const idea =
                      isImage
                        ? await this
                            .ideaFromImageFile(
                              file
                            )
                        : await this
                            .ideaFromFile(
                              file
                            );

                    if (
                      idea
                    ) {
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


  private registerMultiFileMenu():
    void
  {
    const workspace: any =
      this.runtimeWorkspace();

    this.registerEvent(
      workspace.on(
        "files-menu",
        (
          menu: Menu,
          files: TAbstractFile[]
        ) => {
          const notes =
            files.filter(
              (
                file
              ): file is TFile =>
                file instanceof TFile
                &&
                file.extension
                  .toLowerCase()
                  === "md"
            );

          if (
            notes.length < 2
          ) {
            return;
          }

          menu.addItem(
            (item: any) => {
              item
                .setTitle(
                  "Send to INZRT"
                )
                .setIcon("send")
                .onClick(
                  async () => {
                    const ideas =
                      await Promise.all(
                        notes.map(
                          (file) =>
                            this.ideaFromFile(
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


  private registerFloatingCaptureActions():
    void
  {
    /*
     Text selection.

     We use the Obsidian editor for the actual text
     whenever possible, and DOM geometry only to
     position the visual capsule.
     */
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
      (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          this.hideFloatingAction();
          return;
        }

        if (
          event.shiftKey
          || event.key.startsWith("Arrow")
        ) {
          window.setTimeout(
            () => this.showTextSelectionAction(),
            0
          );
        }
      }
    );

    /*
     Image click.

     Do not preventDefault or stopPropagation.
     Obsidian remains fully responsible for native
     image selection, resize handles and controls.
     */
    this.registerDomEvent(
      document,
      "click",
      (event: MouseEvent) => {
        const target =
          event.target instanceof Element
            ? event.target
            : null;

        if (!target) {
          return;
        }

        if (
          this.floatingActionEl
          && this.floatingActionEl.contains(target)
        ) {
          return;
        }

        const image =
          this.findClickedImage(target);

        if (!image) {
          return;
        }

        if (
          !image.closest(
            ".markdown-source-view, .markdown-preview-view"
          )
        ) {
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

    /*
     Any new interaction outside the capsule dismisses
     the previous action.
     */
    this.registerDomEvent(
      document,
      "pointerdown",
      (event: PointerEvent) => {
        const target =
          event.target instanceof Node
            ? event.target
            : null;

        if (
          target
          && this.floatingActionEl
          && this.floatingActionEl.contains(target)
        ) {
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


  private hideFloatingActionBound =
    (): void => {
      this.hideFloatingAction();
    };


  private findClickedImage(
    start: Element
  ): HTMLImageElement | null
  {
    let element: Element | null =
      start;

    while (element) {
      if (
        element instanceof HTMLImageElement
      ) {
        return element;
      }

      element =
        element.parentElement;
    }

    return null;
  }


  private getSelectionAnchorRect(
    view: MarkdownView | null
  ): DOMRect | null
  {
    const selection =
      window.getSelection();

    if (
      selection
      && selection.rangeCount > 0
      && !selection.isCollapsed
    ) {
      const range =
        selection.getRangeAt(0);

      const clientRects =
        Array.from(
          range.getClientRects()
        )
        .filter(
          (rect) =>
            rect.width > 0
            && rect.height > 0
        );

      if (clientRects.length > 0) {
        return clientRects[
          clientRects.length - 1
        ];
      }

      const boundingRect =
        range.getBoundingClientRect();

      if (
        boundingRect.width > 0
        || boundingRect.height > 0
      ) {
        return boundingRect;
      }
    }

    /*
     Live Preview fallback.

     CodeMirror renders selected regions as
     cm-selectionBackground elements.
     */
    if (view) {
      const selectionRects =
        Array.from(
          view.containerEl.querySelectorAll<HTMLElement>(
            ".cm-selectionBackground"
          )
        )
        .map(
          (element) =>
            element.getBoundingClientRect()
        )
        .filter(
          (rect) =>
            rect.width > 0
            && rect.height > 0
        );

      if (selectionRects.length > 0) {
        return selectionRects[
          selectionRects.length - 1
        ];
      }
    }

    return null;
  }


  private showTextSelectionAction():
    void
  {
    const view =
      this.app.workspace
        .getActiveViewOfType(
          MarkdownView
        );

    const editorSelection =
      view?.editor.getSelection()
      ?? "";

    const domSelection =
      window.getSelection()
        ?.toString()
      ?? "";

    const selectedText =
      editorSelection.trim().length > 0
        ? editorSelection
        : domSelection;

    if (
      selectedText.trim().length === 0
    ) {
      this.hideFloatingAction();
      return;
    }

    const anchorRect =
      this.getSelectionAnchorRect(
        view
      );

    if (!anchorRect) {
      this.hideFloatingAction();
      return;
    }

    const activeFile =
      view?.file
      ?? this.app.workspace.getActiveFile();

    /*
     INZRT-style position:
     aligned to the end of the selected text and
     slightly above it when room is available.
     */
    const requestedX =
      anchorRect.right - 68;

    const requestedY =
      anchorRect.top >= 38
        ? anchorRect.top - 36
        : anchorRect.bottom + 6;

    this.showFloatingAction(
      requestedX,
      requestedY,
      () => {
        this.sendPayload([
          {
            kind: "selection",
            content: selectedText,
            sourceTitle:
              activeFile?.basename,
            sourcePath:
              activeFile?.path
          }
        ]);
      }
    );
  }


  private showImageCaptureAction(
    image: HTMLImageElement,
    clickX: number,
    clickY: number
  ): void
  {
    /*
     Position the capsule next to the click rather
     than in a fixed image corner. This avoids
     Obsidian's own zoom/source controls and resize
     handle.
     */
    const requestedX =
      clickX - 34;

    const requestedY =
      clickY >= 40
        ? clickY - 38
        : clickY + 10;

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


  private async sendClickedImage(
    image: HTMLImageElement
  ): Promise<void>
  {
    const sourceCandidates =
      [
        image.currentSrc,
        image.getAttribute("src"),
        image.getAttribute("data-src")
      ]
      .filter(
        (value): value is string =>
          Boolean(value)
      );

    const remoteSource =
      sourceCandidates.find(
        (value) =>
          value.startsWith("https://")
          || value.startsWith("http://")
      );

    let idea:
      CaptureIdea | null =
        null;

    if (remoteSource) {
      idea =
        await this.ideaFromRemoteImage(
          remoteSource
        );
    } else {
      const file =
        this.resolveImageFileFromElement(
          image,
          sourceCandidates
        );

      if (!file) {
        new Notice(
          "Could not locate image in vault"
        );
        return;
      }

      idea =
        await this.ideaFromImageFile(
          file
        );
    }

    if (idea) {
      this.sendPayload([
        idea
      ]);
    }
  }


  private resolveImageFileFromElement(
    image: HTMLImageElement,
    sourceCandidates: string[]
  ): TFile | null
  {
    const candidates:
      string[] = [];

    const addCandidate =
      (
        raw:
          string | null | undefined
      ) => {
        if (!raw) {
          return;
        }

        let value = raw;

        try {
          value =
            decodeURIComponent(
              value
            );
        } catch {
          // Keep original value.
        }

        const queryIndex =
          value.indexOf("?");

        if (queryIndex >= 0) {
          value =
            value.substring(
              0,
              queryIndex
            );
        }

        const hashIndex =
          value.indexOf("#");

        if (hashIndex >= 0) {
          value =
            value.substring(
              0,
              hashIndex
            );
        }

        candidates.push(value);
      };

    for (
      const source
      of sourceCandidates
    ) {
      addCandidate(source);
    }

    addCandidate(
      image.getAttribute("data-path")
    );

    addCandidate(
      image.getAttribute("alt")
    );

    const imageFiles =
      this.app.vault
        .getFiles()
        .filter(
          (file) =>
            this.isSupportedImageFile(
              file
            )
        );

    /*
     Prefer exact/full-path resolution.
     */
    for (
      const candidate
      of candidates
    ) {
      for (
        const file
        of imageFiles
      ) {
        if (
          candidate === file.path
          || candidate.endsWith(
            "/" + file.path
          )
          || candidate.endsWith(
            file.path
          )
        ) {
          return file;
        }
      }
    }

    /*
     Filename fallback only when there is exactly
     one matching image in the vault.
     */
    for (
      const candidate
      of candidates
    ) {
      const filename =
        candidate
          .split("/")
          .filter(Boolean)
          .pop();

      if (!filename) {
        continue;
      }

      const matches =
        imageFiles.filter(
          (file) =>
            file.name === filename
        );

      if (matches.length === 1) {
        return matches[0];
      }
    }

    return null;
  }


  private showFloatingAction(
    requestedX: number,
    requestedY: number,
    action: () => void
  ): void
  {
    this.hideFloatingAction();

    const button =
      document.createElement(
        "button"
      );

    button.type =
      "button";

    button.className =
      "inzrt-capture-bubble";

    button.setAttribute(
      "aria-label",
      "Send to INZRT"
    );

    const icon =
      document.createElement(
        "span"
      );

    icon.className =
      "inzrt-capture-bubble-icon";

    setIcon(
      icon,
      "send"
    );

    const label =
      document.createElement(
        "span"
      );

    label.className =
      "inzrt-capture-bubble-label";

    label.textContent =
      "INZRT";

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

    this.floatingActionEl =
      button;

    const rect =
      button.getBoundingClientRect();

    const margin =
      8;

    const x =
      Math.max(
        margin,
        Math.min(
          requestedX,
          window.innerWidth
            - rect.width
            - margin
        )
      );

    const y =
      Math.max(
        margin,
        Math.min(
          requestedY,
          window.innerHeight
            - rect.height
            - margin
        )
      );

    button.style.left =
      `${x}px`;

    button.style.top =
      `${y}px`;
  }


  private hideFloatingAction():
    void
  {
    this.floatingActionEl
      ?.remove();

    this.floatingActionEl =
      null;
  }


  private isSupportedImageFile(
    file: TFile
  ): boolean {
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
      file.extension
        .toLowerCase()
    );
  }


  private mimeTypeForExtension(
    extension: string
  ): string | undefined {
    switch (
      extension.toLowerCase()
    ) {
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
        return undefined;
    }
  }


  private async ideaFromImageFile(
    file: TFile
  ): Promise<CaptureIdea | null> {
    try {
      const data =
        await this.app.vault
          .readBinary(
            file
          );

      if (
        data.byteLength === 0
      ) {
        throw new Error(
          "Image file is empty"
        );
      }

      return {
        kind:
          "image",

        image: {
          dataBase64:
            Buffer
              .from(data)
              .toString(
                "base64"
              ),

          mimeType:
            this.mimeTypeForExtension(
              file.extension
            ),

          originalFileName:
            file.name
        },

        sourceTitle:
          file.basename,

        sourcePath:
          file.path
      };
    } catch (
      error
    ) {
      console.error(
        "[INZRT Companion] local image read failed:",
        error
      );

      new Notice(
        "Could not read image"
      );

      return null;
    }
  }


  private async ideaFromRemoteImage(
    rawUrl: string
  ): Promise<CaptureIdea | null> {
    try {
      const response =
        await requestUrl({
          url:
            rawUrl,

          method:
            "GET",

          throw:
            false
        });

      if (
        response.status < 200
        ||
        response.status >= 300
      ) {
        throw new Error(
          `HTTP ${response.status}`
        );
      }

      if (
        response.arrayBuffer.byteLength
          === 0
      ) {
        throw new Error(
          "Downloaded image is empty"
        );
      }

      const contentTypeEntry =
        Object.entries(
          response.headers
        )
        .find(
          ([key]) =>
            key.toLowerCase()
              === "content-type"
        );

      const responseMimeType =
        contentTypeEntry
          ? String(
              contentTypeEntry[1]
            )
            .split(";")[0]
            .trim()
          : undefined;

      const parsed =
        new URL(
          rawUrl
        );

      const rawFileName =
        parsed.pathname
          .split("/")
          .filter(Boolean)
          .pop();

      const originalFileName =
        rawFileName
          ? decodeURIComponent(
              rawFileName
            )
          : undefined;

      const extension =
        originalFileName
          ?.split(".")
          .pop()
          ?.toLowerCase();

      const mimeType =
        responseMimeType
          ?.toLowerCase()
          .startsWith(
            "image/"
          )
          ? responseMimeType
          : extension
            ? this
                .mimeTypeForExtension(
                  extension
                )
            : undefined;

      if (
        !mimeType
      ) {
        throw new Error(
          "Downloaded resource is not a supported image"
        );
      }

      return {
        kind:
          "image",

        image: {
          dataBase64:
            Buffer
              .from(
                response.arrayBuffer
              )
              .toString(
                "base64"
              ),

          mimeType,

          originalFileName
        },

        sourceTitle:
          originalFileName,

        sourcePath:
          rawUrl
      };
    } catch (
      error
    ) {
      console.error(
        "[INZRT Companion] remote image download failed:",
        error
      );

      new Notice(
        "Could not download image"
      );

      return null;
    }
  }


  private async ideaFromFile(
    file: TFile
  ): Promise<CaptureIdea> {
    const markdown =
      await this.app.vault
        .cachedRead(file);

    /*
     Empty/title-only note:
     filename becomes the Idea.

     Otherwise preserve the note body exactly.
    */
    const content =
      markdown.trim().length > 0
        ? markdown
        : file.basename;

    return {
      kind:
        "note",

      content,

      sourceTitle:
        file.basename,

      sourcePath:
        file.path
    };
  }


  private sendPayload(
    ideas: CaptureIdea[]
  ): void {
    if (
      ideas.length === 0
    ) {
      return;
    }

    if (
      !existsSync(
        DEBUG_INZRT_APP
      )
    ) {
      new Notice(
        "INZRT test build is not available"
      );

      console.error(
        "[INZRT Companion] Missing app:",
        DEBUG_INZRT_APP
      );

      return;
    }

    try {
      const directory =
        join(
          tmpdir(),
          "inzrt-companion"
        );

      mkdirSync(
        directory,
        {
          recursive:
            true
        }
      );

      const capturePath =
        join(
          directory,
          `${randomUUID()}.inzrtcapture`
        );

      const envelope:
        CaptureEnvelope =
      {
        version:
          1,

        ideas
      };

      writeFileSync(
        capturePath,
        JSON.stringify(
          envelope,
          null,
          2
        ),
        "utf8"
      );

      /*
       The file is the payload.

       `open -a` launches INZRT when closed or
       activates the already-running installed app
       and delivers the capture file to it.
      */
      execFile(
        "/usr/bin/open",
        [
          "-a",
          DEBUG_INZRT_APP,
          capturePath
        ],
        (
          error
        ) => {
          if (
            error
          ) {
            console.error(
              "[INZRT Companion] open failed:",
              error
            );

            new Notice(
              "Could not open INZRT"
            );

            return;
          }

          new Notice(
            ideas.length === 1
              ? "Sent to INZRT"
              : `Sent ${ideas.length} Ideas to INZRT`
          );
        }
      );
    } catch (
      error
    ) {
      console.error(
        "[INZRT Companion] send failed:",
        error
      );

      new Notice(
        "Could not send to INZRT"
      );
    }
  }
}
