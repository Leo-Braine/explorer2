import * as vscode from "vscode";
import { save } from "./dataSource/save";
import { config } from "./global";
import { FavoritesProvider } from "./treeDataProviders/favoritesProvider";

export class Favorites {
  private treeDataProvider: FavoritesProvider;
  view: vscode.TreeView<any>;
  context: vscode.ExtensionContext;
  constructor(context: vscode.ExtensionContext) {
    const treeDataProvider = new FavoritesProvider();
    this.treeDataProvider = treeDataProvider;
    this.view = vscode.window.createTreeView("favorites", { treeDataProvider });
    this.context = context;

    vscode.commands.registerCommand("favorites.refresh", () => this.refresh());
    vscode.commands.registerCommand("favorites.open", (fsPath) => this.open(fsPath));
    vscode.commands.registerCommand("favorites.delFromFavorites", (element) => this.delFromFavorites(element));
  }

  private refresh(): void {
    
    this.treeDataProvider.refresh();
  }
  Ï;

  private open(fsPath: string): void {
    
    config.mainRootDirectory = fsPath;
    if (!config.opened.includes(config.mainRootDirectory)) {
      config.opened.push(config.mainRootDirectory);
      save(this.context);
      vscode.commands.executeCommand("opened.refresh");
    }
    vscode.commands.executeCommand("explorer2.refresh");
  }

  private delFromFavorites(element: any): void {
    
    config.favorites = config.favorites.filter((favorite) => favorite !== element);
    save(this.context);
    this.treeDataProvider.refresh();
  }
}
