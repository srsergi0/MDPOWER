export type FileEntry = {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileEntry[];
  content?: string;
};

export type ThemeSummary = {
  id: string;
  name: string;
  mode: "light" | "dark";
  editorColor: string;
  sidebarColor: string;
  source: "bundled" | "user";
  hasPreview: boolean;
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
      openExternalUrl: {
        params: { url: string };
        response: { success: boolean };
      };
      listThemes: {
        params: {};
        response: { themes: ThemeSummary[] };
      };
      getThemesCSS: {
        params: {};
        response: { css: string };
      };
      installTheme: {
        params: { url: string };
        response: { success: true; id: string } | { success: false; error: string };
      };
      installThemeFromPath: {
        params: { path: string };
        response: { success: true; id: string } | { success: false; error: string };
      };
      getThemesDir: {
        params: {};
        response: { bundled: string; user: string };
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
      themesChanged: { themes: ThemeSummary[] };
    };
  };
};
