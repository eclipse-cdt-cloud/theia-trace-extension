import * as React from 'react';
import { inject, injectable } from '@theia/core/shared/inversify';
import { DialogProps } from '@theia/core/lib/browser/dialogs';
import { ReactDialog } from '@theia/core/lib/browser/dialogs/react-dialog';
import { Message } from '@theia/core/lib/browser/widgets/widget';
import { KeyboardShortcutsComponent } from 'traceviewer-react-components/lib/trace-explorer/trace-explorer-sub-widgets/keyboard-shortcuts-component';

@injectable()
export class ChartShortcutsDialogProps extends DialogProps {}

@injectable()
export class ChartShortcutsDialog extends ReactDialog<undefined> {
    constructor(@inject(ChartShortcutsDialogProps) protected readonly props: ChartShortcutsDialogProps) {
        super(props);
        this.appendAcceptButton();
    }

    protected render(): React.ReactNode {
        return <KeyboardShortcutsComponent />;
    }

    protected onAfterAttach(msg: Message): void {
        super.onAfterAttach(msg);
        this.update();
    }

    get value(): undefined {
        return undefined;
    }
}
