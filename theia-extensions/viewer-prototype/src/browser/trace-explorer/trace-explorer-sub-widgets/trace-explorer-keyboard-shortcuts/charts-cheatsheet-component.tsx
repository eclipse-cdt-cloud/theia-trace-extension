import * as React from 'react';
import { inject, injectable, postConstruct } from 'inversify';
import { Dialog, DialogProps } from '@theia/core/lib/browser/dialogs';
import { ReactDialog } from '@theia/core/lib/browser/dialogs/react-dialog';
import { Message } from '@theia/core/lib/browser/widgets/widget';
import { EssentialShortcutsTable } from './essential-shortcuts-table';
import { ZoomPanShortcutsTable } from './zoom-pan-shortcuts-table';
import { TimeGraphShortcutsTable } from './time-graph-navigation-shortcuts-table';
import { SelectShortcutsTable } from './select-shortcuts-table';

@injectable()
export class ChartShortcutsDialogProps extends DialogProps {
}

@injectable()
export class ChartShortcutsDialog extends ReactDialog<void> {

    constructor(
        @inject(ChartShortcutsDialogProps) protected readonly props: ChartShortcutsDialogProps
    ) {
        super({
            title: 'Trace Viewer Keyboard and Mouse Shortcuts',
        });
        this.appendAcceptButton(Dialog.OK);
    }

    @postConstruct()
    protected async init(): Promise<void> {
        this.title.label = 'Trace Viewer Keyboard and Mouse Shortcuts';
        this.update();
    }

    protected render(): React.ReactNode {
        return (
            <div className="shortcuts-table">
                <EssentialShortcutsTable />
                <ZoomPanShortcutsTable />
                <TimeGraphShortcutsTable />
                <SelectShortcutsTable />
            </div>
        );
    }

    protected onAfterAttach(msg: Message): void {
        super.onAfterAttach(msg);
        this.update();
    }

    get value(): undefined { return undefined; }
}
