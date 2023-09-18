/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import {AriaMenuProps} from '@react-types/menu';
import {DOMAttributes, KeyboardDelegate} from '@react-types/shared';
import {filterDOMProps, mergeProps} from '@react-aria/utils';
import {Key, RefObject} from 'react';
import {TreeState} from '@react-stately/tree';
import {useSelectableList} from '@react-aria/selection';

export interface MenuAria {
  /** Props for the menu element. */
  menuProps: DOMAttributes
}

export interface AriaMenuOptions<T> extends Omit<AriaMenuProps<T>, 'children'> {
  /** Whether the menu uses virtual scrolling. */
  isVirtualized?: boolean,

  /**
   * An optional keyboard delegate implementation for type to select,
   * to override the default.
   */
  keyboardDelegate?: KeyboardDelegate,
  // TODO: just extend KeyboardEvents? update type
  onKeyDown?: (e: KeyboardEvent) => void
}

interface MenuData {
  onClose?: () => void,
  onAction?: (key: Key) => void
}

export const menuData = new WeakMap<TreeState<unknown>, MenuData>();

/**
 * Provides the behavior and accessibility implementation for a menu component.
 * A menu displays a list of actions or options that a user can choose.
 * @param props - Props for the menu.
 * @param state - State for the menu, as returned by `useListState`.
 */
export function useMenu<T>(props: AriaMenuOptions<T>, state: TreeState<T>, ref: RefObject<HTMLElement>): MenuAria {
  let {
    shouldFocusWrap = true,
    onKeyDown,
    ...otherProps
  } = props;

  if (!props['aria-label'] && !props['aria-labelledby']) {
    console.warn('An aria-label or aria-labelledby prop is required for accessibility.');
  }

  let domProps = filterDOMProps(props, {labelable: true});
  let {listProps} = useSelectableList({
    ...otherProps,
    ref,
    selectionManager: state.selectionManager,
    collection: state.collection,
    disabledKeys: state.disabledKeys,
    shouldFocusWrap,
    linkBehavior: 'override'
  });

  menuData.set(state, {
    onClose: props.onClose,
    onAction: props.onAction
  });

  return {
    menuProps: mergeProps(domProps, {onKeyDown}, {
      role: 'menu',
      // this forces AT to move their cursors into any open sub dialogs, the sub dialogs contain hidden close buttons in order to come back to this level of the menu
      // TODO: since we are hiding the previous menu, perhaps we should get rid of the aria-labelledby on a sub menu since it is pointing to a trigger in the hidden menu
      // Replace it with a aria-label of the trigger's text content? Problem is that we don't have access to that in the submenu
      'aria-hidden': state.expandedKeys.size > 0 ? true : undefined,
      ...listProps,
      onKeyDown: (e) => {
        // don't clear the menu selected keys if the user is presses escape since escape closes the menu
        if (e.key !== 'Escape') {
          listProps.onKeyDown(e);
        }
      }
    })
  };
}
