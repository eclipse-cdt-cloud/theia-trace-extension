export class EntryTreeNode {
    public _id: number;
    public _name: string;
    public _children: EntryTreeNode[] = [];
    public _indentLevel: number;

    constructor(id: number, name: string, indentLevel: number) {
        this._id = id;
        this._name = name;
        this._indentLevel = indentLevel;
    }

    public addChild(child: any) {
        this._children.push(child);
    }

    public getNbChildren(): number {
        let nbChildren = this._children.length;
        this._children.forEach((child) => {
            const childCount = child.getNbChildren();
            nbChildren += childCount;
        })

        return nbChildren;
    }

    public toFlatList() : EntryTreeNode[] {
        let flatList = new Array<EntryTreeNode>();
        flatList.push(this);
        this._children.forEach(child => {
            const childList = child.toFlatList();
            flatList.push(...childList);
        });

        return flatList;
    }

    public toString(): string {
        let result = (this._name === '' ? '----------' : this._name) + ' (' + this._id + ')' + '\n';
        if(this._children.length > 0) {
            this._children.forEach(child => {
                result = result + '\t' + child.toString();
            });
        }
        return result;
    }
}