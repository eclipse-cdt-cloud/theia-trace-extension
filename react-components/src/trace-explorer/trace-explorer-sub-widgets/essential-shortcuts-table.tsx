import { faQuestionCircle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';

export class EssentialShortcutsTable extends React.Component {
    render(): React.ReactNode {
        return (
            <React.Fragment>
                <span className="shortcuts-table-header">ESSENTIAL</span>
                <div className="shortcuts-table-row">
                    <div className="shortcuts-table-column">
                        <table>
                            <tbody>
                                <tr>
                                    <td>
                                        <FontAwesomeIcon icon={faQuestionCircle} size="lg" className="shortcuts-icon" />{' '}
                                        Display This Menu
                                    </td>
                                    <td className="shortcuts-table-keybinding">
                                        <span className="shortcuts-table-keybinding-key">CTRL / command</span>
                                        <span className="shortcuts-table-keybinding-key">F1</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="shortcuts-table-column">
                        <table></table>
                    </div>
                </div>
            </React.Fragment>
        );
    }
}
