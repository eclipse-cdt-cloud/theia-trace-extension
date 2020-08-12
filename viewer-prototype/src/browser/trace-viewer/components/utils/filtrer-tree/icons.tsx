import * as React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronRight, faCheckSquare, faSquare, faMinusSquare, faSort, faSortDown, faSortUp } from '@fortawesome/free-solid-svg-icons';

interface iconsShape {
    expand: React.ReactNode,
    collapse: React.ReactNode,
    unchecked: React.ReactNode,
    checked: React.ReactNode,
    halfChecked: React.ReactNode,
    sort: React.ReactNode,
    sortDown: React.ReactNode,
    sortUp: React.ReactNode
}

const icons: iconsShape = {
    expand: <FontAwesomeIcon icon={faChevronRight}/>,
    collapse: <FontAwesomeIcon icon={faChevronDown}/>,
    unchecked: <FontAwesomeIcon icon={faSquare}/>,
    checked: <FontAwesomeIcon icon={faCheckSquare}/>,
    halfChecked: <FontAwesomeIcon icon={faMinusSquare}/>,
    sort: <FontAwesomeIcon icon={faSort}/>,
    sortDown: <FontAwesomeIcon icon={faSortDown}/>,
    sortUp: <FontAwesomeIcon icon={faSortUp}/>
};

export default icons;
