import * as React from 'react';

export class EventsTableShortcutsTable extends React.Component {

    render(): React.ReactNode {
        return <React.Fragment>
            <span className='shortcuts-table-header'>TABLE NAVIGATION</span>
            <div className='shortcuts-table-row'>
                <div className='shortcuts-table-column'>
                    <table>
                        <tbody>
                            <tr>
                                <td>Cell Navigation</td>
                                <td className='monaco-keybinding shortcuts-table-keybinding'>
                                    <span className='monaco-keybinding-key'><i className='fa fa-arrow-up' /></span>
                                    <span className='monaco-keybinding-key'><i className='fa fa-arrow-down' /></span>
                                    <span className='monaco-keybinding-key'><i className='fa fa-arrow-left' /></span>
                                    <span className='monaco-keybinding-key'><i className='fa fa-arrow-right' /></span>
                                </td>
                            </tr>
                            <tr>
                                <td>Page Up</td>
                                <td className='monaco-keybinding shortcuts-table-keybinding'>
                                    <span className='monaco-keybinding-key'>Page Up</span>
                                </td>
                            </tr>
                            <tr>
                                <td>Page Down</td>
                                <td className='monaco-keybinding shortcuts-table-keybinding'>
                                    <span className='monaco-keybinding-key'>Page Down</span>
                                </td>
                            </tr>
                            <tr>
                                <td>Multi-select</td>
                                <td className='monaco-keybinding shortcuts-table-keybinding'>
                                    <span className='monaco-keybinding-key'>Shift</span>
                                    <span className='monaco-keybinding-key'>Click</span>
                                    <span className='monaco-keybinding-seperator'>or</span>
                                    <span className='monaco-keybinding-key'>Shift</span>
                                    <span className='monaco-keybinding-key'><i className='fa fa-arrow-up' /></span>
                                    <span className='monaco-keybinding-key'><i className='fa fa-arrow-down' /></span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div className='shortcuts-table-column'>
                    <table>
                        <tbody>
                            <tr>
                                <td>Deselect row(s)</td>
                                <td className='monaco-keybinding shortcuts-table-keybinding'>
                                    <span className='monaco-keybinding-key'>Ctrl</span>
                                    <span className='monaco-keybinding-seperator'>or</span>
                                    <span className='monaco-keybinding-key'>meta</span>
                                </td>
                            </tr>
                            <tr>
                                <td>Go to first row</td>
                                <td className='monaco-keybinding shortcuts-table-keybinding'>
                                    <span className='monaco-keybinding-key'>Home</span>
                                </td>
                            </tr>
                            <tr>
                                <td>Go to last row</td>
                                <td className='monaco-keybinding shortcuts-table-keybinding'>
                                    <span className='monaco-keybinding-key'>End</span>
                                </td>
                            </tr>
                            <tr>
                                <td>Select current row</td>
                                <td className='monaco-keybinding shortcuts-table-keybinding'>
                                    <span className='monaco-keybinding-key'>Click</span>
                                    <span className='monaco-keybinding-seperator'>or</span>
                                    <span className='monaco-keybinding-key'>Space</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </React.Fragment>;
    }
}
