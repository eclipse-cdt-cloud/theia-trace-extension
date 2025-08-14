import { faHandPaper, faMinusSquare, faPlusSquare, faRedo, faUndo } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';

export class ZoomPanShortcutsTable extends React.Component {
    render(): React.ReactNode {
        return (
            <React.Fragment>
                <span className="shortcuts-table-header">ZOOM AND PAN</span>
                <div className="shortcuts-table-row">
                    <div className="shortcuts-table-column">
                        <table>
                            <tbody>
                                <tr>
                                    <td>
                                        <FontAwesomeIcon icon={faPlusSquare} size="lg" className="shortcuts-icon" />{' '}
                                        Zoom in
                                    </td>
                                    <td className="shortcuts-table-keybinding">
                                        <span className="shortcuts-table-keybinding-key">W</span>
                                        <span className="-seperator">or</span>
                                        <span className="shortcuts-table-keybinding-key">I</span>
                                        <span className="-seperator">or</span>
                                        <span className="shortcuts-table-keybinding-key">CTRL</span>
                                        <span className="shortcuts-table-keybinding-key">Scroll</span>
                                        <span className="-seperator">or</span>
                                        <span className="shortcuts-table-keybinding-key">+</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <FontAwesomeIcon icon={faMinusSquare} size="lg" className="shortcuts-icon" />{' '}
                                        Zoom out
                                    </td>
                                    <td className="shortcuts-table-keybinding">
                                        <span className="shortcuts-table-keybinding-key">S</span>
                                        <span className="-seperator">or</span>
                                        <span className="shortcuts-table-keybinding-key">K</span>
                                        <span className="-seperator">or</span>
                                        <span className="shortcuts-table-keybinding-key">CTRL</span>
                                        <span className="shortcuts-table-keybinding-key">Scroll</span>
                                        <span className="-seperator">or</span>
                                        <span className="shortcuts-table-keybinding-key">-</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <FontAwesomeIcon icon={faHandPaper} size="lg" className="shortcuts-icon" /> Pan
                                    </td>
                                    <td className="shortcuts-table-keybinding">
                                        <span className="shortcuts-table-keybinding-key">A</span>
                                        <span className="-seperator">&</span>
                                        <span className="shortcuts-table-keybinding-key">D</span>
                                        <span className="-seperator">or</span>
                                        <span className="shortcuts-table-keybinding-key">J</span>
                                        <span className="-seperator">&</span>
                                        <span className="shortcuts-table-keybinding-key">L</span>
                                        <span className="-seperator">or</span>
                                        <span className="shortcuts-table-keybinding-key">CTRL</span>
                                        <span className="shortcuts-table-keybinding-key">Drag</span>
                                        <span className="-seperator">or</span>
                                        <span className="shortcuts-table-keybinding-key">Middle-Drag</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="shortcuts-table-column">
                        <table>
                            <tbody>
                                <tr>
                                    <td>
                                        <FontAwesomeIcon icon={faUndo} size="lg" className="shortcuts-icon" /> Undo
                                    </td>
                                    <td className="shortcuts-table-keybinding">
                                        <span className="shortcuts-table-keybinding-key">CTRL</span>
                                        <span className="shortcuts-table-keybinding-key">Z</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <FontAwesomeIcon icon={faRedo} size="lg" className="shortcuts-icon" /> Redo
                                    </td>
                                    <td className="shortcuts-table-keybinding">
                                        <span className="shortcuts-table-keybinding-key">CTRL</span>
                                        <span className="shortcuts-table-keybinding-key">SHIFT</span>
                                        <span className="shortcuts-table-keybinding-key">Z</span>
                                        <span className="-seperator">or</span>
                                        <span className="shortcuts-table-keybinding-key">CTRL</span>
                                        <span className="shortcuts-table-keybinding-key">Y</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td>Zoom to selected range</td>
                                    <td className="shortcuts-table-keybinding">
                                        <span className="shortcuts-table-keybinding-key">Right-Click</span>
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
