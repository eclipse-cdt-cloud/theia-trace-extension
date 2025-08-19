import { faArrowDown, faArrowLeft, faArrowRight, faArrowUp } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';

export class TimeGraphShortcutsTable extends React.Component {
    render(): React.ReactNode {
        return (
            <React.Fragment>
                <span className="shortcuts-table-header">TIME-GRAPH NAVIGATION</span>
                <div className="shortcuts-table-row">
                    <div className="shortcuts-table-column">
                        <table>
                            <tbody>
                                <tr>
                                    <td>Next state</td>
                                    <td className="shortcuts-table-keybinding">
                                        <span className="shortcuts-table-keybinding-key">
                                            <FontAwesomeIcon icon={faArrowRight} className="shortcuts-icon" />
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <td>Previous state</td>
                                    <td className="shortcuts-table-keybinding">
                                        <span className="shortcuts-table-keybinding-key">
                                            <FontAwesomeIcon icon={faArrowLeft} className="shortcuts-icon" />
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <td>Next Marker</td>
                                    <td className="shortcuts-table-keybinding">
                                        <span className="shortcuts-table-keybinding-key">.</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td>Previous Marker</td>
                                    <td className="shortcuts-table-keybinding">
                                        <span className="shortcuts-table-keybinding-key">,</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td>Multi-Select</td>
                                    <td className="shortcuts-table-keybinding">
                                        <span className="shortcuts-table-keybinding-key">Ctrl</span>
                                        <span className="shortcuts-table-keybinding-key">Click</span>
                                        <span>or</span>
                                        <span className="shortcuts-table-keybinding-key">Shift</span>
                                        <span className="shortcuts-table-keybinding-key">Click</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="shortcuts-table-column">
                        <table>
                            <tbody>
                                <tr>
                                    <td>Move up a row</td>
                                    <td className="shortcuts-table-keybinding">
                                        <span className="shortcuts-table-keybinding-key">
                                            <FontAwesomeIcon icon={faArrowUp} className="shortcuts-icon" />
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <td>Move down a row</td>
                                    <td className="shortcuts-table-keybinding">
                                        <span className="shortcuts-table-keybinding-key">
                                            <FontAwesomeIcon icon={faArrowDown} className="shortcuts-icon" />
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <td>Zoom to selected</td>
                                    <td className="shortcuts-table-keybinding">
                                        <span className="shortcuts-table-keybinding-key">Z</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td>Zoom to state&apos;s range</td>
                                    <td className="shortcuts-table-keybinding">
                                        <span>Double-click state</span>
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
