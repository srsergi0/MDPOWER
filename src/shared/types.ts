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
        response: { content: string; html: string; filename: string } | null;
      };
      compileMarkdown: {
        params: { markdown: string };
        response: { html: string };
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
      readFolder: {
        params: { path: string };
        response: FileEntry[];
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
      openExternalUrl: {
        params: { url: string };
        response: { success: boolean };
      };
    };
    messages: {
      log: { msg: string };
    };
  };
  webview: {
    requests: {};
    messages: {
      initialFile: { path: string; content: string; html: string; filename: string };
      fileChanged: { path: string; content: string; html: string };
      folderChanged: { files: FileEntry[] };
    };
  };
};
