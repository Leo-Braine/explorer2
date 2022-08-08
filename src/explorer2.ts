import checkDiskSpace from "check-disk-space";
import { closeSync, copyFileSync, mkdirSync, openSync, renameSync } from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { save } from "./dataSource/save";
import { config } from "./global";
import { Entry } from "./interfaces/entryInterface";
import { PrevInterface } from "./interfaces/prevInterface";
import { isFileExist } from "./services/isFileExist";
import { explorer2Provider } from "./treeDataProviders/explorer2Provider";
import bytes = require("bytes");
import openWithProgram = require("open");

export class Explorer2 {
  private treeDataProvider: explorer2Provider;
  private view: any;
  context: vscode.ExtensionContext;
  constructor(context: vscode.ExtensionContext) {
    const treeDataProvider = new explorer2Provider();
    this.treeDataProvider = treeDataProvider;
    this.view = vscode.window.createTreeView("explorer2", { treeDataProvider });
    this.setAvail(context);
    this.context = context;

    context.subscriptions.push(
      vscode.window.onDidChangeWindowState(() => {
        this.refresh();
      })
    );

    vscode.commands.registerCommand("explorer2.cloud", () => {
      vscode.env.openExternal(vscode.Uri.parse("https://github.com/Leo-Braine/explorer2/issues/1"));
    });

    vscode.commands.registerCommand("explorer2.newFile", () => {
      vscode.window
        .showInputBox({
          placeHolder: "New file name",
          value: "file.json",
        })
        .then((value) => {
          if (!value) return;
          const newFilePath = path.join(config.mainRootDirectory, value);
          if (isFileExist(newFilePath)) {
            vscode.window.showWarningMessage(`${newFilePath} is already taken. Please choose a different name.`);
          } else {
            closeSync(openSync(newFilePath, "w"));
            this.refresh();
          }
        });
    });

    vscode.commands.registerCommand("explorer2.newFolder", () => {
      vscode.window
        .showInputBox({
          placeHolder: "New folder name",
          value: "Folder",
        })
        .then((value) => {
          if (!value) return;
          const newFolderPath = path.join(config.mainRootDirectory, value);
          if (isFileExist(newFolderPath)) {
            vscode.window.showWarningMessage(`${newFolderPath} is already taken. Please choose a different name.`);
          } else {
            mkdirSync(newFolderPath, { recursive: true });
            this.refresh();
          }
        });
    });

    vscode.commands.registerCommand("explorer2.cut", (resource) => {
      config.copiedFilePath = "";
      config.cutFilePath = path.join(config.mainRootDirectory, resource.uri.fsPath);
    });
    vscode.commands.registerCommand("explorer2.copy", (resource) => {
      config.cutFilePath = "";
      config.copiedFilePath = path.join(config.mainRootDirectory, resource.uri.fsPath);
    });
    vscode.commands.registerCommand("explorer2.paste", (resource) => {
      if (config.copiedFilePath) {
        const constCopiedFileName = path.basename(config.copiedFilePath);
        const newPath = this.findNewPathForExistsFile(path.join(config.mainRootDirectory, constCopiedFileName));

        copyFileSync(config.copiedFilePath, newPath);
        this.refresh();
      } else if (config.cutFilePath) {
        const constCopiedFileName = path.basename(config.cutFilePath);
        const newPath = this.findNewPathForExistsFile(path.join(config.mainRootDirectory, constCopiedFileName));

        renameSync(config.cutFilePath, newPath);
        this.refresh();
      }
    });

    vscode.commands.registerCommand("explorer2.delete", async (resource) => {
      if (resource.id !== "goUpInTheTree") {
        if (!resource.uri.fsPath) {
          return;
        }
        const newUri = vscode.Uri.parse(path.join(config.mainRootDirectory, resource.uri.fsPath));
        await vscode.workspace.fs.delete(newUri, {
          recursive: true,
          useTrash: true,
        });
        this.refresh();
      } else {
        await vscode.workspace.fs.delete(vscode.Uri.parse(config.mainRootDirectory), {
          recursive: true,
          useTrash: true,
        });
        this.goUpInTheTree();
      }
    });

    vscode.commands.registerCommand("explorer2.rename", (resource) => {
      if (!resource.uri.fsPath) {
        return;
      }

      vscode.window
        .showInputBox({
          placeHolder: "New name",
          value: path.basename(resource.uri.fsPath),
        })
        .then((value) => {
          if (!value) return;
          const oldPath = path.join(config.mainRootDirectory, resource.uri.fsPath);
          const newPath = path.join(config.mainRootDirectory, value);
          if (isFileExist(newPath)) {
            vscode.window.showWarningMessage(`${newPath} is already taken. Please choose a different name.`);
          } else {
            renameSync(oldPath, newPath);
            this.refresh();
          }
        });
    });
    vscode.commands.registerCommand("explorer2.openFile", (resource) => this.openResource(resource));
    vscode.commands.registerCommand("explorer2.openFolder", (resource) => this.openFolder(resource));
    vscode.commands.registerCommand("explorer2.refresh", () => this.refresh());
    vscode.commands.registerCommand("explorer2.collapse", () => this.collapse());
    vscode.commands.registerCommand("explorer2.goUpInTheTree", () => this.goUpInTheTree());
    vscode.commands.registerCommand("explorer2.addToFavorites", (element) => this.addToFavorites(element));
    vscode.commands.registerCommand("opened.addToFavorites", (element) => this.addToFavoritesFromOpened(element));
    vscode.commands.registerCommand("explorer2.openWithDefaultProgram", (element) =>
      this.openWithDefaultProgram(element)
    );

    vscode.commands.registerCommand("explorer2.sortByTime", () => this.sortByTimeDesc());
    vscode.commands.registerCommand("explorer2.sortByTimeAsc", () => this.sortByTimeAsc());
    vscode.commands.registerCommand("explorer2.sortByTimeDesc", () => this.sortByTimeDesc());
    vscode.commands.registerCommand("explorer2.sortBySize", () => this.sortBySizeDesc());
    vscode.commands.registerCommand("explorer2.sortBySizeAsc", () => this.sortBySizeAsc());
    vscode.commands.registerCommand("explorer2.sortBySizeDesc", () => this.sortBySizeDesc());
    vscode.commands.registerCommand("explorer2.sortByName", () => this.sortByNameDesc());
    vscode.commands.registerCommand("explorer2.sortByNameAsc", () => this.sortByNameAsc());
    vscode.commands.registerCommand("explorer2.sortByNameDesc", () => this.sortByNameDesc());

    vscode.commands.registerCommand("a_few_seconds_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("a_minute_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("2_minutes_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("3_minutes_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("4_minutes_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("5_minutes_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("6_minutes_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("7_minutes_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("8_minutes_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("9_minutes_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("10_minutes_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("11_minutes_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("12_minutes_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("13_minutes_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("14_minutes_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("15_minutes_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("16_minutes_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("17_minutes_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("18_minutes_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("19_minutes_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("20_minutes_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("21_minutes_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("22_minutes_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("23_minutes_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("24_minutes_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("25_minutes_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("26_minutes_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("27_minutes_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("28_minutes_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("29_minutes_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("30_minutes_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("31_minutes_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("32_minutes_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("33_minutes_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("34_minutes_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("35_minutes_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("36_minutes_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("37_minutes_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("38_minutes_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("39_minutes_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("40_minutes_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("41_minutes_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("42_minutes_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("43_minutes_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("44_minutes_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("an_hour_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("2_hours_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("3_hours_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("4_hours_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("5_hours_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("6_hours_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("7_hours_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("8_hours_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("9_hours_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("10_hours_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("11_hours_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("12_hours_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("13_hours_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("14_hours_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("15_hours_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("16_hours_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("17_hours_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("18_hours_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("19_hours_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("20_hours_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("21_hours_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("a_day_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("2_days_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("3_days_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("4_days_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("5_days_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("6_days_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("7_days_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("8_days_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("9_days_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("10_days_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("11_days_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("12_days_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("13_days_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("14_days_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("15_days_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("16_days_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("17_days_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("18_days_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("19_days_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("20_days_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("21_days_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("22_days_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("23_days_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("24_days_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("25_days_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("a_month_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("2_months_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("3_months_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("4_months_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("5_months_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("6_months_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("7_months_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("8_months_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("9_months_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("10_months_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("a_year_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("2_years_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("3_years_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("4_years_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("5_years_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("6_years_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("7_years_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("8_years_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("9_years_ago", (e) => this.empty(e));
    vscode.commands.registerCommand("many_years_ago", (e) => this.empty(e));
  }

  private empty(element: any) {
    if (element.type === vscode.FileType.File) {
      this.openResource(element.uri);
    } else {
      this.openFolder(element.uri);
    }
  }

  private findNewPathForExistsFile(filePath: string): string {
    let postfix = " copy";
    const parsed = path.parse(filePath);
    let exists = isFileExist(filePath);
    if (!exists) {
      return filePath;
    }
    while (exists) {
      const newPath = path.join(parsed.dir, `${parsed.name}${postfix}${parsed.ext}`);
      exists = isFileExist(newPath);
      if (isFileExist(newPath)) {
        postfix += " copy";
      } else {
        return newPath;
      }
    }
  }

  private setAvail(context?: vscode.ExtensionContext) {
    checkDiskSpace("/").then((diskSpace) => {
      if (diskSpace) {
        this.view.title = `Explorer2`;
        this.view.description = `Avail: ${bytes(diskSpace.free)}`;
      }
      if (context) {
        context.subscriptions.push(this.view);
      }
    });
  }

  private openResource(resource: vscode.Uri): void {
    const newUri = vscode.Uri.parse(path.join(config.mainRootDirectory, resource.fsPath));

    if (config.prevOpen && config.prevOpen.path === newUri.fsPath && Date.now() - config.prevOpen.time < 1000) {
      openWithProgram(newUri.fsPath);
    } else {
      config.prevOpen = undefined;
      vscode.commands.executeCommand("vscode.open", newUri);
    }
    config.prevOpen = { path: newUri.fsPath, time: Date.now() };
  }

  private openFolder(resource: vscode.Uri): void {
    if (this.isCanOpenDirectory(config.prevOpen, resource.fsPath)) {
      config.mainRootDirectory = path.join(config.mainRootDirectory, resource.fsPath);
      if (!config.opened.includes(config.mainRootDirectory)) {
        config.opened.push(config.mainRootDirectory);
        save(this.context);
        config.prevOpen = undefined;

        vscode.commands.executeCommand("opened.refresh");
      }
      this.refresh();
    }
    config.prevOpen = { path: resource.fsPath, time: Date.now() };
  }

  private refresh(): void {
    this.setAvail();

    this.treeDataProvider.refresh();
  }

  private collapse(): void {
    this.treeDataProvider.collapse();
  }

  private isCanOpenDirectory(conf: PrevInterface, fsPath: string): boolean {
    const openFolderClicks = vscode.workspace.getConfiguration().get("explorer2.openFolder");
    if (openFolderClicks === "singleClick") {
      return true;
    } else {
      return conf && conf.path === fsPath && Date.now() - conf.time < 1000;
    }
  }
  private goUpInTheTree(): void {
    if (this.isCanOpenDirectory(config.prevGoUp, config.mainRootDirectory)) {
      config.mainRootDirectory = path.join(config.mainRootDirectory, "..");

      config.prevGoUp = undefined;
      config.prevOpen = undefined;
      this.treeDataProvider.refresh();
    } else {
      config.prevGoUp = { path: config.mainRootDirectory, time: Date.now() };
    }
  }

  private addToFavorites(element: Entry): void {
    const addToFavoritesPath = path.join(config.mainRootDirectory, element.uri.fsPath);
    if (!config.favorites.includes(addToFavoritesPath)) {
      config.favorites.push(addToFavoritesPath);
      save(this.context);

      vscode.commands.executeCommand("favorites.refresh");
    }
  }

  private addToFavoritesFromOpened(element: string): void {
    if (!config.favorites.includes(element)) {
      config.favorites.push(element);
      save(this.context);
      vscode.commands.executeCommand("favorites.refresh");
    }
  }

  private openWithDefaultProgram(element: Entry): void {
    openWithProgram(path.join(config.mainRootDirectory, element.uri.fsPath));
  }

  private sortByTimeAsc(): void {
    config.sorting = "timeAsc";
    save(this.context);
    this.refresh();
  }

  private sortByTimeDesc(): void {
    config.sorting = "timeDesc";
    save(this.context);
    this.refresh();
  }

  private sortBySizeAsc(): void {
    config.sorting = "sizeAsc";
    save(this.context);
    this.refresh();
  }

  private sortBySizeDesc(): void {
    config.sorting = "sizeDesc";
    save(this.context);
    this.refresh();
  }

  private sortByNameAsc(): void {
    config.sorting = "nameAsc";
    save(this.context);
    this.refresh();
  }

  private sortByNameDesc(): void {
    config.sorting = "nameDesc";
    save(this.context);
    this.refresh();
  }
}
