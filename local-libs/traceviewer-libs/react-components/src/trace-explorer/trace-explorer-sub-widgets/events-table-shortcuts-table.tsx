import { faArrowDown, faArrowLeft, faArrowRight, faArrowUp } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';

export class EventsTableShortcutsTable extends React.Component {
    render(): React.ReactNode {
        return (
            <React.Fragment>
                <span className="shortcuts-table-header">TABLE NAVIGATION</span>
                <div className="shortcuts-table-row">
                    <div className="shortcuts-table-column">
                        <table>
                            <tbody>
                                <tr>
                                    <td>Cell Navigation</td>
                                    <td className="shortcuts-table-keybinding">
                                        <span className="shortcuts-table-keybinding-key">
                                            <FontAwesomeIcon icon={faArrowUp} className="shortcuts-icon" />
                                        </span>
                                        <span className="shortcuts-table-keybinding-key">
                                            <FontAwesomeIcon icon={faArrowDown} className="shortcuts-icon" />
                                        </span>
                                        <span className="shortcuts-table-keybinding-key">
                                            <FontAwesomeIcon icon={faArrowLeft} className="shortcuts-icon" />
                                        </span>
                                        <span className="shortcuts-table-keybinding-key">
                                            <FontAwesomeIcon icon={faArrowRight} className="shortcuts-icon" />
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <td>Page Up</td>
                                    <td className="shortcuts-table-keybinding">
                                        <span className="shortcuts-table-keybinding-key">Page Up</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td>Page Down</td>
                                    <td className="shortcuts-table-keybinding">
                                        <span className="shortcuts-table-keybinding-key">Page Down</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td>Multi-select</td>
                                    <td className="shortcuts-table-keybinding">
                                        <span className="shortcuts-table-keybinding-key">Shift</span>
                                        <span className="shortcuts-table-keybinding-key">Click</span>
                                        <span>or</span>
                                        <span className="shortcuts-table-keybinding-key">Shift</span>
                                        <span className="shortcuts-table-keybinding-key">
                                            <FontAwesomeIcon icon={faArrowUp} className="shortcuts-icon" />
                                        </span>
                                        <span className="shortcuts-table-keybinding-key">
                                            <FontAwesomeIcon icon={faArrowDown} className="shortcuts-icon" />
                                        </span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="shortcuts-table-column">
                        <table>
                            <tbody>
                                <tr>
                                    <td>Deselect row(s)</td>
                                    <td className="shortcuts-table-keybinding">
                                        <span className="shortcuts-table-keybinding-key">Ctrl</span>
                                        <span>or</span>
                                        <span className="shortcuts-table-keybinding-key">meta</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td>Go to first row</td>
                                    <td className="shortcuts-table-keybinding">
                                        <span className="shortcuts-table-keybinding-key">Home</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td>Go to last row</td>
                                    <td className="shortcuts-table-keybinding">
                                        <span className="shortcuts-table-keybinding-key">End</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td>Select current row</td>
                                    <td className="shortcuts-table-keybinding">
                                        <span className="shortcuts-table-keybinding-key">Click</span>
                                        <span>or</span>
                                        <span className="shortcuts-table-keybinding-key">Space</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </React.Fragment>
        );
    }
}
