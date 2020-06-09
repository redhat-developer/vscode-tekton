/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';


const withDragDropContext = <TProps extends {}>(Component: React.ComponentClass<TProps>) => (
  props: TProps,
) => (
  <DndProvider backend={HTML5Backend}>
    <Component {...props} />
  </DndProvider>
);

export default withDragDropContext;
