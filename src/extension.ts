import * as vscode from "vscode";
import { get } from "./dataSource/get";
import { Explorer2 } from "./explorer2";
import { Favorites } from "./favorites";
import { Opened } from "./opened";

export async function activate(context: vscode.ExtensionContext) {
  get(context);

  context.subscriptions.push(
    vscode.window.onDidChangeWindowState(() => {
      get(context);
    })
  );

  new Explorer2(context);
  new Opened(context);
  new Favorites(context);
}
