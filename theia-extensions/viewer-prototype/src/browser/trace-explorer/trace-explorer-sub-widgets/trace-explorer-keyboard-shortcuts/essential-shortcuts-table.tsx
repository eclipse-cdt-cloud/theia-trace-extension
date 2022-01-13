import * as React from 'react';

export class EssentialShortcutsTable extends React.Component {

    render(): React.ReactNode {
        return <React.Fragment>
            <span className='shortcuts-table-header'>ESSENTIAL</span>
            <div className='shortcuts-table-row'>
                <div className='shortcuts-table-column'>
                    <table>
                        <tbody>
                            <tr>
                                <td><i className='fa fa-question-circle fa-lg' /> Display This Menu</td>
                                <td className='monaco-keybinding shortcuts-table-keybinding'>
                                    <span className='monaco-keybinding-key'>CTRL / command</span>
                                    <span className='monaco-keybinding-key'>F1</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div className='shortcuts-table-column'>
                    <table></table>
                </div>
            </div>
        </React.Fragment>;
    }
}
