import * as React from 'react';
import { inject, injectable } from 'inversify';
import { DialogProps } from '@theia/core/lib/browser/dialogs';
import { ReactDialog } from '@theia/core/lib/browser/dialogs/react-dialog';
import { Message } from '@theia/core/lib/browser/widgets/widget';
import { EssentialShortcutsTable } from './essential-shortcuts-table';
import { ZoomPanShortcutsTable } from './zoom-pan-shortcuts-table';
import { TimeGraphShortcutsTable } from './time-graph-navigation-shortcuts-table';
import { EventsTableShortcutsTable } from './events-table-shortcuts-table';
import { SelectShortcutsTable } from './select-shortcuts-table';

@injectable()
export class ChartShortcutsDialogProps extends DialogProps {}

@injectable()
export class ChartShortcutsDialog extends ReactDialog<undefined> {
    constructor(@inject(ChartShortcutsDialogProps) protected readonly props: ChartShortcutsDialogProps) {
        super(props);
        this.appendAcceptButton();
    }

    protected render(): React.ReactNode {
        return (
            <div className="shortcuts-table">
                <EssentialShortcutsTable />
                <ZoomPanShortcutsTable />
                <TimeGraphShortcutsTable />
                <EventsTableShortcutsTable />
                <SelectShortcutsTable />
            </div>
        );
    }

    protected onAfterAttach(msg: Message): void {
        super.onAfterAttach(msg);
        this.update();
    }

    get value(): undefined {
        return undefined;
    }
}
