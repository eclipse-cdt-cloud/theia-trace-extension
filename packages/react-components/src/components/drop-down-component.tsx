/***************************************************************************************
 * Copyright (c) 2023 BlackBerry Limited and contributors.
 *
 * Licensed under the MIT license. See LICENSE file in the project root for details.
 ***************************************************************************************/

import React from 'react';
import { AbstractOutputProps } from './abstract-output-component';

export interface OptionState {
    label: string;
    condition?: () => boolean;
    onClick?: (arg?: unknown) => void;
    arg?: () => unknown;
}

type OptionProps = AbstractOutputProps & OptionState;

export class DropDownOption extends React.Component<OptionProps, OptionState> {
    constructor(props: OptionProps) {
        super(props);
        this.state = {
            label: props.label,
            onClick: props.onClick ?? undefined,
            arg: props.arg ?? undefined,
            condition: props.condition ?? (() => true)
        };
    }

    render(): JSX.Element {
        return (
            <React.Fragment>
                {this.state.condition?.() && (
                    <li className="drop-down-list-item" onClick={() => this.state.onClick?.(this.state.arg?.())}>
                        <div className="drop-down-list-item-text">{this.state.label}</div>
                    </li>
                )}
            </React.Fragment>
        );
    }
}

type DropDownProps = AbstractOutputProps & {
    dropDownOptions: OptionState[];
    dropDownOpen: boolean;
};

export class DropDownComponent extends React.Component<DropDownProps> {
    public optionsMenuRef: React.RefObject<HTMLDivElement>;

    constructor(props: DropDownProps) {
        super(props);
        this.optionsMenuRef = React.createRef();
    }

    render(): JSX.Element {
        return (
            <React.Fragment>
                {this.props.dropDownOpen && (
                    <div className="options-menu-drop-down" ref={this.optionsMenuRef}>
                        <ul>
                            {this.props.dropDownOptions?.map((option, index) => (
                                <DropDownOption {...this.props} key={index} {...option} />
                            ))}
                        </ul>
                    </div>
                )}
            </React.Fragment>
        );
    }
}
