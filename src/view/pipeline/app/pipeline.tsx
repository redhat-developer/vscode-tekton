/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as React from 'react';
import { makeStyles, Theme, createStyles } from '@material-ui/core/styles';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Card, Typography} from '@material-ui/core';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import AddClusterView from './pipelineView'

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    menuButton: {
      marginRight: theme.spacing(2),
    },
    title: {
      flexGrow: 1,
      fontSize: '1.25em'
    },
    media: {
      height: 60,
      padding: '20px'
    },
    container: {
      marginTop: '4em',
      marginBottom: '8em'
    },
    textWhite: {
      marginBottom: '20px!important',
      textAlign: 'left'
    },
    App: {
      textAlign: 'center'
    },
    rowBody: {
      padding: '0 10em 0 10em'
    },
    cardTransform: {
      width: '33%',
      float: 'left',
      marginRight: theme.spacing(4),
      marginLeft: theme.spacing(4),
      position: 'relative',
      overflow: 'hidden',
      transform: 'scale(0.95)',
      '&:hover': {
        transform: 'scale(1)',
        boxShadow: '5px 20px 30px rgba(0,0,0,0.2)'
      }
    },
    cardHeader: {
      backgroundColor: '#00586d!important',
      padding: theme.spacing(2),
      borderBottom: '0 solid transparent'
    },
    cardButton: {
      display: 'block',
      marginBottom: theme.spacing(2)
    }
  }),
);


// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default function Header() {
  const classes = useStyles();

  return (
    <div className={classes.App}>
      <div className={classes.container}>
        <Card>
          <Typography variant='body2' component='p' style={{paddingBottom: '5px'}}>
            <h1 style={{fontSize: '30px'}}>Start Pipeline</h1>
          </Typography>
          <AddClusterView />
        </Card>
      </div>
    </div>
  );
}
