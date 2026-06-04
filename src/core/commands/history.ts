import type { Command } from "./commands";

/**
 * Undo/redo stacks. This class only orders the command stacks; it never holds
 * the document. Callers run `command.invert(doc)` on the result of `popUndo`
 * and `command.apply(doc)` on the result of `popRedo`. Pushing a new command
 * clears the redo branch, matching standard editor behaviour.
 */
export class History {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];

  push(command: Command): void {
    this.undoStack.push(command);
    this.redoStack = [];
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** Move the top command to the redo stack and return it (to be inverted). */
  popUndo(): Command | undefined {
    const command = this.undoStack.pop();
    if (command) this.redoStack.push(command);
    return command;
  }

  /** Move the top redone command back to the undo stack and return it (to apply). */
  popRedo(): Command | undefined {
    const command = this.redoStack.pop();
    if (command) this.undoStack.push(command);
    return command;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
