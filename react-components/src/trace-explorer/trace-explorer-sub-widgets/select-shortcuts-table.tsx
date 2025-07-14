import { faArrowLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';

export class SelectShortcutsTable extends React.Component {
    render(): React.ReactNode {
        return (
            <React.Fragment>
                <span className="shortcuts-table-header">SELECT</span>
                <div className="shortcuts-table-row">
                    <div className="shortcuts-table-column">
                        <table>
                            <tbody>
                                <tr>
                                    <td>Select element</td>
                                    <td className="shortcuts-table-keybinding">
                                        <span>Click element</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td>Select point in time</td>
                                    <td className="shortcuts-table-keybinding">
                                        <span>Click anywhere in chart</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="shortcuts-table-column">
                        <table>
                            <tbody>
                                <tr>
                                    <td>Extend time range</td>
                                    <td className="shortcuts-table-keybinding">
                                        <span className="shortcuts-table-keybinding-key">Shift</span>
                                        <span className="shortcuts-table-keybinding-key">Click</span>
                                        <span className="-seperator">or</span>
                                        <span className="shortcuts-table-keybinding-key">Shift</span>
                                        <span className="shortcuts-table-keybinding-key">
                                            <FontAwesomeIcon icon={faArrowLeft} className="shortcuts-icon" />
                                        </span>
                                        <span className="shortcuts-table-keybinding-key">
                                            <FontAwesomeIcon icon={faArrowRight} className="shortcuts-icon" />
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <td>Select time range</td>
                                    <td className="shortcuts-table-keybinding">
                                        <span className="shortcuts-table-keybinding-key">Drag</span>
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
