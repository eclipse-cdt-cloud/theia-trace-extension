import * as React from 'react';

export class TimeGraphShortcutsTable extends React.Component {

    render(): React.ReactNode {
        return <React.Fragment>
            <span className='shortcuts-table-header'>TIME-GRAPH NAVIGATION</span>
            <div className='shortcuts-table-row'>
                <div className='shortcuts-table-column'>
                    <table>
                        <tbody>
                            <tr>
                                <td>Next state</td>
                                <td className='monaco-keybinding shortcuts-table-keybinding'>
                                    <span className='monaco-keybinding-key'><i className='fa fa-arrow-right' /></span>
                                </td>
                            </tr>
                            <tr>
                                <td>Previous state</td>
                                <td className='monaco-keybinding shortcuts-table-keybinding'>
                                    <span className='monaco-keybinding-key'><i className='fa fa-arrow-left' /></span>
                                </td>
                            </tr>
                            <tr>
                                <td>Zoom to state&apos;s range</td>
                                <td className='monaco-keybinding shortcuts-table-keybinding'>
                                    <span>Double-click state</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div className='shortcuts-table-column'>
                    <table>
                        <tbody>
                            <tr>
                                <td>Move up a row</td>
                                <td className='monaco-keybinding shortcuts-table-keybinding'>
                                    <span className='monaco-keybinding-key'><i className='fa fa-arrow-up' /></span>
                                </td>
                            </tr>
                            <tr>
                                <td>Move down a row</td>
                                <td className='monaco-keybinding shortcuts-table-keybinding'>
                                    <span className='monaco-keybinding-key'><i className='fa fa-arrow-down' /></span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </React.Fragment>;
    }
}
