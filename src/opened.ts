import * as vscode from "vscode";
import { save } from "./dataSource/save";
import { config } from "./global";
import { OpenedProvider } from "./treeDataProviders/openedProvider";

export class Opened {
  private treeDataProvider: OpenedProvider;
  view: vscode.TreeView<any>;
  context: vscode.ExtensionContext;
  constructor(context: vscode.ExtensionContext) {
    const treeDataProvider = new OpenedProvider();
    this.treeDataProvider = treeDataProvider;
    this.view = vscode.window.createTreeView("opened", { treeDataProvider });
    this.context = context;

    vscode.commands.registerCommand("opened.refresh", () => this.refresh());
    vscode.commands.registerCommand("opened.open", (fsPath) => this.open(fsPath));
    vscode.commands.registerCommand("opened.delFromOpened", (element) => this.delFromOpened(element));
  }

  private refresh(): void {
    this.treeDataProvider.refresh();
  }

  private open(fsPath: string): void {
    config.mainRootDirectory = fsPath;
    vscode.commands.executeCommand("explorer2.refresh");
  }

  private delFromOpened(element: any): void {
    config.opened = config.opened.filter((open) => open !== element);
    save(this.context);
    this.treeDataProvider.refresh();
  }
}
