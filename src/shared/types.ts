export type FileEntry = {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileEntry[];
  content?: string;
};

export type MarkdownReaderRPC = {
  bun: {
    requests: {
      openFileDialog: {
        params: {};
        response: { content: string; path: string; filename: string } | null;
      };
      openFolderDialog: {
        params: {};
        response: string[] | null;
      };
      getFileContent: {
        params: { path: string };
        response: { content: string; filename: string };
      };
      resolvePath: {
        params: { basePath: string; relativePath: string };
        response: string;
      };
      startWatching: {
        params: { path: string };
        response: {};
      };
      stopWatching: {
        params: {};
        response: {};
      };
      saveFile: {
        params: { path: string; content: string };
        response: {};
      };
      readFolder: {
        params: { path: string };
        response: FileEntry[];
      };
      savePdf: {
        params: { markdown: string; filename: string; options: import("./buildPrintHTML").PrintOptions };
        response: { path: string } | null;
      };
      startWatchingFolder: {
        params: { path: string };
        response: {};
      };
      stopWatchingFolder: {
        params: {};
        response: {};
      };
      searchInFolder: {
        params: { path: string; query: string };
        response: { path: string; filename: string; line: number; content: string }[];
      };
      saveHtml: {
        params: { markdown: string; filename: string };
        response: { path: string } | null;
      };
      openExternalUrl: {
        params: { url: string };
        response: { success: boolean };
      };
    };
    messages: {
      log: { msg: string };
      folderChanged: { files: FileEntry[] };
    };
  };
  webview: {
    requests: {};
    messages: {
      initialFile: { path: string; content: string; filename: string };
      fileChanged: { path: string; content: string };
    };
  };
};
