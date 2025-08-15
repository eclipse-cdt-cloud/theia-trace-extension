import * as React from 'react';
import { EssentialShortcutsTable } from './essential-shortcuts-table';
import { EventsTableShortcutsTable } from './events-table-shortcuts-table';
import { SelectShortcutsTable } from './select-shortcuts-table';
import { TimeGraphShortcutsTable } from './time-graph-navigation-shortcuts-table';
import { ZoomPanShortcutsTable } from './zoom-pan-shortcuts-table';

export class KeyboardShortcutsComponent extends React.Component {
    render(): React.ReactNode {
        return (
            <React.Fragment>
                <div className="shortcuts-table">
                    <EssentialShortcutsTable />
                    <ZoomPanShortcutsTable />
                    <TimeGraphShortcutsTable />
                    <EventsTableShortcutsTable />
                    <SelectShortcutsTable />
                </div>
            </React.Fragment>
        );
    }
}
