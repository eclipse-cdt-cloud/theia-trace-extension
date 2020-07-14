import * as React from 'react';
import { EntryTree } from '../entry-tree';
import { create } from 'react-test-renderer';
import { render, fireEvent } from "@testing-library/react";
import { within } from "@testing-library/dom";

const mockOnChecked = jest.fn();
const mockOnCollapse = jest.fn();

test('Empty tree', () => {
    const tree = create(<EntryTree
        entries={[]}
        collapsedNodes={[]}
        checkedSeries={[]}
        showCheckboxes={true}
        showFilter={false}
        onToggleCheck={mockOnChecked}
        onToggleCollapse={mockOnCollapse}
    />)
        .toJSON();
    expect(tree).toMatchSnapshot();
});

test('one level of entries', () => {
    const entry1 = {
        id: 0,
        parentId: -1,
        labels: ['entry1']

    };
    const entry2 = {
        id: 1,
        parentId: -1,
        labels: ['entry2', 'entry2 column2']

    };
    const treeWithoutCheckboxes = create(<EntryTree
        entries={[entry1, entry2]}
        collapsedNodes={[]}
        checkedSeries={[]}
        showCheckboxes={false}
        showFilter={false}
        onToggleCheck={mockOnChecked}
        onToggleCollapse={mockOnCollapse}
        showHeader={true}
        headers={[{title: 'Sortable column', sortable: true}, {title: 'Unsortable column', sortable: false}]}
    />)
        .toJSON();
    expect(treeWithoutCheckboxes).toMatchSnapshot();

    const treeWithCheckboxes = create(<EntryTree
        entries={[entry1, entry2]}
        collapsedNodes={[]}
        checkedSeries={[]}
        showCheckboxes={true}
        showFilter={false}
        onToggleCheck={mockOnChecked}
        onToggleCollapse={mockOnCollapse}
        showHeader={true}
        headers={[{title: 'Sortable column', sortable: true}, {title: 'Unsortable column', sortable: false}]}
    />)
    expect(treeWithCheckboxes).toMatchSnapshot();

    const treeWithoutHeaders = create(<EntryTree
        entries={[entry1, entry2]}
        collapsedNodes={[]}
        checkedSeries={[]}
        showCheckboxes={true}
        showFilter={false}
        onToggleCheck={mockOnChecked}
        onToggleCollapse={mockOnCollapse}
        showHeader={false}
        headers={[{title: 'Sortable column', sortable: true}, {title: 'Unsortable column', sortable: false}]}
    />)
    expect(treeWithoutHeaders).toMatchSnapshot();
});

describe('Entry with children', () => {
    const parent = {
        id: 0,
        parentId: -1,
        labels: ['parent', 'parent second column']
    };
    const child1 = {
        id: 1,
        parentId: parent.id,
        labels: ['child1', 'child1 second column']
    };
    const child2 = {
        id: 2,
        parentId: parent.id,
        labels: ['child2', 'child2 second column']
    };
    const grandchild1 = {
        id: 3,
        parentId: child2.id,
        labels: ['grandchild1', 'grandchild1 second column']
    };
    const grandchild2 = {
        id: 4,
        parentId: child2.id,
        labels: ['grandchild2', 'grandchild2 second column']
    };

    test('All unchecked', () => {
        const tree = create(<EntryTree
            entries={[child1, parent, child2, grandchild1, grandchild2]}
            collapsedNodes={[]}
            checkedSeries={[]}
            showCheckboxes={true}
            showFilter={false}
            onToggleCheck={mockOnChecked}
            onToggleCollapse={mockOnCollapse}
            showHeader={true}
            headers={[{title: 'Sortable column', sortable: true}, {title: 'Unsortable column', sortable: false}]}
        />)
            .toJSON();
        expect(tree).toMatchSnapshot();
    });

    test('Check one grandchild', () => {
        const tree = create(<EntryTree
            entries={[child1, parent, child2, grandchild1, grandchild2]}
            collapsedNodes={[]}
            showCheckboxes={true}
            showFilter={false}
            checkedSeries={[grandchild1.id]}
            onToggleCheck={mockOnChecked}
            onToggleCollapse={mockOnCollapse}
            showHeader={true}
            headers={[{title: 'Sortable column', sortable: true}, {title: 'Unsortable column', sortable: false}]}
        />)
            .toJSON();
        expect(tree).toMatchSnapshot();
    });

    test('Collapse one child', () => {
        const tree = create(<EntryTree
            entries={[child1, parent, child2, grandchild1, grandchild2]}
            collapsedNodes={[child2.id]}
            checkedSeries={[]}
            showCheckboxes={true}
            showFilter={false}
            onToggleCheck={mockOnChecked}
            onToggleCollapse={mockOnCollapse}
            showHeader={true}
            headers={[{title: 'Sortable column', sortable: true}, {title: 'Unsortable column', sortable: false}]}
        />)
            .toJSON();
        expect(tree).toMatchSnapshot();
    });

    test('Check series', () => {
        mockOnChecked.mockClear();
        let { getByText } = render(<EntryTree
            entries={[child1, parent, child2, grandchild1, grandchild2]}
            collapsedNodes={[]}
            checkedSeries={[]}
            showCheckboxes={true}
            showFilter={false}
            onToggleCheck={mockOnChecked}
            onToggleCollapse={mockOnCollapse}
            showHeader={true}
            headers={[{title: 'Sortable column', sortable: true}, {title: 'Unsortable column', sortable: false}]}
        />)
        // Check a parent and make sure all its children were selected too
        const element = getByText(child2.labels[0]);
        const image = within(element).getAllByRole("img", {hidden: true})[1];
        fireEvent.click(image as HTMLElement);
        expect(mockOnChecked).toHaveBeenCalledTimes(1);
        expect(mockOnChecked).toHaveBeenCalledWith([child2.id, grandchild1.id, grandchild2.id]);
        mockOnChecked.mockClear();

        // Check a child and make sure all its children were selected too
        const childElement = getByText(grandchild1.labels[0]);
        const image2 = within(childElement).getByRole("img", {hidden: true});
        fireEvent.click(image2 as HTMLElement);
        expect(mockOnChecked).toHaveBeenCalledTimes(1);
        expect(mockOnChecked).toHaveBeenCalledWith([grandchild1.id]);
        mockOnChecked.mockClear();

        // Check again the parent element, should check all items
        fireEvent.click(image as HTMLElement);
        expect(mockOnChecked).toHaveBeenCalledTimes(1);
        expect(mockOnChecked).toHaveBeenCalledWith([child2.id, grandchild1.id, grandchild2.id]);

    });

    test('Check series with previous selected', () => {
        mockOnChecked.mockClear();
        let { getByText } = render(<EntryTree
            entries={[child1, parent, child2, grandchild1, grandchild2]}
            collapsedNodes={[]}
            showCheckboxes={true}
            showFilter={false}
            checkedSeries={[grandchild2.id]}
            onToggleCheck={mockOnChecked}
            onToggleCollapse={mockOnCollapse}
            showHeader={true}
            headers={[{title: 'Sortable column', sortable: true}, {title: 'Unsortable column', sortable: false}]}
        />)
        // Check a parent and make sure all its children were selected too
        const element = getByText(child2.labels[0]);
        const image = within(element).getAllByRole("img", {hidden: true})[1];
        fireEvent.click(image as HTMLElement);
        expect(mockOnChecked).toHaveBeenCalledTimes(1)
        expect(mockOnChecked).toHaveBeenCalledWith([child2.id, grandchild1.id])
    });

    test('Collapse items', () => {
        mockOnCollapse.mockClear()
        const { getByText } = render(<EntryTree
            entries={[child1, parent, child2, grandchild1, grandchild2]}
            collapsedNodes={[]}
            checkedSeries={[]}
            showCheckboxes={true}
            showFilter={false}
            onToggleCheck={mockOnChecked}
            onToggleCollapse={mockOnCollapse}
            showHeader={true}
            headers={[{title: 'Sortable column', sortable: true}, {title: 'Unsortable column', sortable: false}]}
        />)
        // Click on the collapse icon of the element and make sure the function is called
        const element = getByText(child2.labels[0]);
        const collapseImage = within(element).getAllByRole("img", {hidden: true})[0];
        fireEvent.click(collapseImage as HTMLElement);
        expect(mockOnCollapse).toHaveBeenCalledTimes(1)
        expect(mockOnCollapse).toHaveBeenCalledWith(child2.id, expect.anything())
    });

    test('With filter element', () => {
        const tree = create(<EntryTree
            entries={[child1, parent, child2, grandchild1, grandchild2]}
            collapsedNodes={[]}
            checkedSeries={[]}
            showCheckboxes={true}
            showFilter={true}
            onToggleCheck={mockOnChecked}
            onToggleCollapse={mockOnCollapse}
            showHeader={true}
            headers={[{title: 'Sortable column', sortable: true}, {title: 'Unsortable column', sortable: false}]}
        />)
            .toJSON();
        expect(tree).toMatchSnapshot();
    });

    test('Filter items behavior', () => {
        const { getByPlaceholderText, queryByText } = render(<EntryTree
            entries={[child1, parent, child2, grandchild1, grandchild2]}
            collapsedNodes={[]}
            checkedSeries={[]}
            showCheckboxes={true}
            showFilter={true}
            onToggleCheck={mockOnChecked}
            onToggleCollapse={mockOnCollapse}
            showHeader={true}
            headers={[{title: 'Sortable column', sortable: true}, {title: 'Unsortable column', sortable: false}]}
        />)
        // Enter a filter and make sure only visible elements are present
        const filterEl = getByPlaceholderText("Filter");
        fireEvent.change(filterEl, {target: { value: grandchild2.labels[0]}});

        let treeEl = queryByText(parent.labels[0]);
        expect(treeEl).toBeTruthy();

        treeEl = queryByText(child1.labels[0]);
        expect(treeEl).toBeFalsy();

        treeEl = queryByText(child2.labels[0]);
        expect(treeEl).toBeTruthy();

        treeEl = queryByText(grandchild1.labels[0]);
        expect(treeEl).toBeFalsy();

        treeEl = queryByText(grandchild2.labels[0]);
        expect(treeEl).toBeTruthy();

        // Remove the filter
        const filterEl2 = getByPlaceholderText("Filter");
        fireEvent.change(filterEl2, {target: { value: ""}});

        treeEl = queryByText(parent.labels[0]);
        expect(treeEl).toBeTruthy();

        treeEl = queryByText(child1.labels[0]);
        expect(treeEl).toBeTruthy();

        treeEl = queryByText(child2.labels[0]);
        expect(treeEl).toBeTruthy();

        treeEl = queryByText(grandchild1.labels[0]);
        expect(treeEl).toBeTruthy();

        treeEl = queryByText(grandchild2.labels[0]);
        expect(treeEl).toBeTruthy();
    });
});
