import * as React from 'react';

export class ZoomPanShortcutsTable extends React.Component {

    render(): React.ReactNode {
        return <React.Fragment>
            <span className='shortcuts-table-header'>ZOOM AND PAN</span>
            <div className='shortcuts-table-row'>
                <div className='shortcuts-table-column'>
                    <table>
                        <tbody>
                            <tr>
                                <td><i className='fa fa-plus-square-o fa-lg' /> Zoom in</td>
                                <td className='monaco-keybinding shortcuts-table-keybinding'>
                                    <span className='monaco-keybinding-key'>W</span>
                                    <span className='monaco-keybinding-seperator'>or</span>
                                    <span className='monaco-keybinding-key'>I</span>
                                    <span className='monaco-keybinding-seperator'>or</span>
                                    <span className='monaco-keybinding-key'>CTRL</span>
                                    <span className='monaco-keybinding-key'>Scroll</span>
                                    <span className='monaco-keybinding-seperator'>or</span>
                                    <span className='monaco-keybinding-key'>+</span>
                                </td>
                            </tr>
                            <tr>
                                <td><i className='fa fa-minus-square-o fa-lg' /> Zoom out</td>
                                <td className='monaco-keybinding shortcuts-table-keybinding'>
                                    <span className='monaco-keybinding-key'>S</span>
                                    <span className='monaco-keybinding-seperator'>or</span>
                                    <span className='monaco-keybinding-key'>K</span>
                                    <span className='monaco-keybinding-seperator'>or</span>
                                    <span className='monaco-keybinding-key'>CTRL</span>
                                    <span className='monaco-keybinding-key'>Scroll</span>
                                    <span className='monaco-keybinding-seperator'>or</span>
                                    <span className='monaco-keybinding-key'>-</span>
                                </td>
                            </tr>
                            <tr>
                                <td><i className='fa fa-hand-paper-o fa-lg' /> Pan</td>
                                <td className='monaco-keybinding shortcuts-table-keybinding'>
                                    <span className='monaco-keybinding-key'>A</span>
                                    <span className='monaco-keybinding-seperator'>&</span>
                                    <span className='monaco-keybinding-key'>D</span>
                                    <span className='monaco-keybinding-seperator'>or</span>
                                    <span className='monaco-keybinding-key'>J</span>
                                    <span className='monaco-keybinding-seperator'>&</span>
                                    <span className='monaco-keybinding-key'>L</span>
                                    <span className='monaco-keybinding-seperator'>or</span>
                                    <span className='monaco-keybinding-key'>CTRL</span>
                                    <span className='monaco-keybinding-key'>Drag</span>
                                    <span className='monaco-keybinding-seperator'>or</span>
                                    <span className='monaco-keybinding-key'>Middle-Drag</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div className='shortcuts-table-column'>
                    <table>
                        <tbody>
                            <tr>
                                <td>Zoom to selected range</td>
                                <td className='monaco-keybinding shortcuts-table-keybinding'>
                                    <span className='monaco-keybinding-key'>Right-Click</span>
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
