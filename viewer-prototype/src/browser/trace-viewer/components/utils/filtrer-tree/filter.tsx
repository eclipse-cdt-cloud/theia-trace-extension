import * as React from 'react';

type FilterProps = {
    onChange: (e:React.ChangeEvent<HTMLInputElement>) => void;
}

export class Filter extends React.Component<FilterProps> {
    constructor(props: FilterProps) {
        super(props);
    }

    render() {
        return <div onChange={this.props.onChange}>
            <input 
                id="input-filter-tree"
                type="text"
                placeholder="Filter"
            />
        </div>;
    }
}