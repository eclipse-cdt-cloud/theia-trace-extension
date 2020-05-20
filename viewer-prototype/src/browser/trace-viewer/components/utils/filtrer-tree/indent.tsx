import * as React from 'react';

type IndentProps = {
    level: number;
    isLastLevel: boolean;
}

export class Indent extends React.Component<IndentProps> {
    constructor(props: IndentProps) {
        super(props);
    }

    render() {
        if (!this.props.level) return null;
        
        let { level } = this.props;
        level = this.props.isLastLevel ? level+1 : level;
        const padding: number = 15;
        const list: React.ReactElement[] = [];
        
        for(let i = 0; i < level; i += 1) {
            list.push(
                <span key={i} style={{paddingLeft: padding}}></span>
            )
        }

        return <span aria-hidden="true">
            {list}
        </span>
    }
}