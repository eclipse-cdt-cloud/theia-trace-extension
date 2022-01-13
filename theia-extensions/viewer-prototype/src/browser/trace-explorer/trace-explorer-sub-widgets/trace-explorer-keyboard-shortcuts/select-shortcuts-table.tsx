import * as React from 'react';

export class SelectShortcutsTable extends React.Component {

    render(): React.ReactNode {
        return <React.Fragment>
            <span className='shortcuts-table-header'>SELECT</span>
            <div className='shortcuts-table-row'>
                <div className='shortcuts-table-column'>
                    <table>
                        <tbody>
                            <tr>
                                <td>Select element</td>
                                <td className='monaco-keybinding shortcuts-table-keybinding'>
                                    <span>Click element</span>
                                </td>
                            </tr>
                            <tr>
                                <td>Select point in time</td>
                                <td className='monaco-keybinding shortcuts-table-keybinding'>
                                    <span>Click anywhere in chart</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div className='shortcuts-table-column'>
                    <table>
                        <tbody>
                            <tr>
                                <td>Extend time range</td>
                                <td className='monaco-keybinding shortcuts-table-keybinding'>
                                    <span className='monaco-keybinding-key'>Shift</span>
                                    <span className='monaco-keybinding-key'>Click</span>
                                    <span className='monaco-keybinding-seperator'>or</span>
                                    <span className='monaco-keybinding-key'>Shift</span>
                                    <span className='monaco-keybinding-key'><i className='fa fa-arrow-left' /></span>
                                    <span className='monaco-keybinding-key'><i className='fa fa-arrow-right' /></span>
                                </td>
                            </tr>
                            <tr>
                                <td>Select time range</td>
                                <td className='monaco-keybinding shortcuts-table-keybinding'>
                                    <span className='monaco-keybinding-key'>Drag</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </React.Fragment>;
    }
}
