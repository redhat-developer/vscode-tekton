/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as React from 'react';

// import { stringToContext } from '../pipelineViewLoader';
import { makeStyles, Theme, createStyles } from '@material-ui/core/styles';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import Autocomplete from '@material-ui/lab/Autocomplete';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { VpnKey, ChevronRight} from '@material-ui/icons';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Avatar, Button, LinearProgress, List, ListItem, ListItemAvatar, ListItemText, Paper, Stepper, Step, StepLabel, StepContent, TextField, Typography, Grid } from '@material-ui/core';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      textAlign: 'left',
      '& .MuiTextField-root': {
        margin: theme.spacing(1),
        width: '25ch',
      },
      '& .MuiStepContent-root': {
        paddingLeft: theme.spacing(5)
      },
      '& .MuiStepper-root': {
        marginLeft: theme.spacing(4)
      },
      '& .MuiButton-root': {
        textTransform: 'none'
      },
      '& .MuiStepIcon-root.MuiStepIcon-active': {
        color: '#BE0000'
      },
      '& .MuiStepIcon-root.MuiStepIcon-completed': {
        color: '#BE0000'
      },
      '& .MuiButton-containedPrimary': {
        backgroundColor: '#BE0000'
      },
      '& .MuiStepLabel-iconContainer': {
        paddingRight: theme.spacing(2)
      }
    },
    button: {
      marginTop: theme.spacing(1),
      marginRight: theme.spacing(1)
    },
    buttons: {
      display: 'flex',
      justifyContent: 'flex-end',
    },
    actionsContainer: {
      marginBottom: theme.spacing(2),
      marginTop: theme.spacing(2)
    },
    resetContainer: {
      padding: theme.spacing(3),
    },
    formControl: {
      margin: theme.spacing(1),
      minWidth: 120,
      width: '40%'
    },
    uploadLabel: {
      marginTop: theme.spacing(2)
    }
  })
);

declare global {
  interface Window {
      acquireVsCodeApi(): any;
      cmdText;
  }
}

const vscode = window.acquireVsCodeApi();

function getSteps(): string[] {
  const viewTknResource = [];
  const tknResource = ['resources', 'params', 'workspaces', 'serviceAcct'];
  const data = JSON.parse(window.cmdText);
  tknResource.map((value) => {
    if (data[value]) {
      viewTknResource.push(value);
    }
  });
  return viewTknResource;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default function addClusterView(): JSX.Element {
  const classes = useStyles();
  const [fileName, setBinaryPath] = React.useState('');
  const [pullSecretPath, setSecret] = React.useState('');
  const [cpuSize, setCpuSize] = React.useState(4);
  const [memory, setMemory] = React.useState(8192);
  const [state, setState] = React.useState('latest');
  const [crcOut, setOut] = React.useState('');
  const [crcProgress, setProgress] = React.useState(false);
  const messageListener = (event): void => {
    if (event?.data?.action){
      const message = event.data; // The JSON data our extension sent
      switch (message.action) {
        case 'crcoutput' :
          setOut(message.data);
          break;
        case 'crcstatus' :
          if (message.data === 0) setProgress(true);
          break;
        default:
          break;
      }
    }
  }
  window.addEventListener('message', messageListener);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const crcDownload = `http://mirror.openshift.com/pub/openshift-v4/clients/crc/${state}/crc-macos-amd64.tar.xz`;

  const handleUploadPullSecret = (event): void => {
    console.log(crcDownload);
    setSecret(event.target.files[0].path);
  }

  const handleCpuSize = (event): void => {
    setCpuSize(event.target.value);
  }

  const handleMemory = (event): void => {
    setMemory(event.target.value);
  }

  const jsonParserTkn = JSON.parse(window.cmdText);


  const crcVersions = [
    { crcVersion: '1.0.0', openshiftMajorVersion: '4.2', openshiftVersion: '4.2.0'},
    { crcVersion: '1.1.0', openshiftMajorVersion: '4.2', openshiftVersion: '4.2.2'},
    { crcVersion: '1.2.0', openshiftMajorVersion: '4.2', openshiftVersion: '4.2.8'},
    { crcVersion: '1.3.0', openshiftMajorVersion: '4.2', openshiftVersion: '4.2.10'},
    { crcVersion: '1.4.0', openshiftMajorVersion: '4.2', openshiftVersion: '4.2.13'},
    { crcVersion: '1.5.0', openshiftMajorVersion: '4.2', openshiftVersion: '4.2.14'},
    { crcVersion: '1.6.0', openshiftMajorVersion: '4.3', openshiftVersion: '4.3.0'},
    { crcVersion: '1.7.0', openshiftMajorVersion: '4.3', openshiftVersion: '4.3.1'},
    { crcVersion: '1.8.0', openshiftMajorVersion: '4.3', openshiftVersion: '4.3.8'},
    { crcVersion: '1.9.0', openshiftMajorVersion: '4.3', openshiftVersion: '4.3.10'},
    { crcVersion: 'latest', openshiftMajorVersion: '4.4', openshiftVersion: '4.4.3'}
  ];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const resourcesView = (value): JSX.Element => {
    // eslint-disable-next-line no-case-declarations
    const options = jsonParserTkn['pipelineResource'].map((option) => {
      if (value.type === option.type) {
        const majorVersion = option.name;
        return {
          majorVersion: majorVersion,
          ...option,
        };
      }
    });
    return (
      <Autocomplete
        id='grouped-demo'
        options={options.sort((a, b) => b.majorVersion.localeCompare(a.majorVersion))}
        getOptionLabel={(options) => {
          console.log('kldkljdkljdskjsdkljsdkljsdkjsdlkjdfskljsfdkldsfjkldsfjklsdfjkl');
          console.log(options);
          if (options) {
            return options['name']
          }
        }}
        style={{ width: 900 }}
        onInputChange={(_, val) => {
          setState(val);
        }}
        renderInput={(params) => 
          <TextField {...params} label={value.name} variant='outlined' required />
        }
      />
    );
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const getStepContent = (step: string) => {
    switch (step) {
      case 'resources':
        return (
          <Grid container spacing={3} direction='column'>
            {jsonParserTkn['resources'].map((value) => (
              resourcesView(value)
            ))}
          </Grid>
        );
      case 'params':
        // eslint-disable-next-line no-case-declarations
        const params = crcVersions.map((option) => {
          const majorVersion = option.openshiftMajorVersion;
          return {
            majorVersion: majorVersion,
            ...option,
          };
        });
          
        return (
          <Grid container spacing={3} direction='column'>
            <Autocomplete
              id='grouped-demo'
              options={params.sort((a, b) => b.majorVersion.localeCompare(a.majorVersion))}
              groupBy={(option) => `OpenShift: ${option.majorVersion}`}
              getOptionLabel={(option) => option.crcVersion}
              style={{ width: 900 }}
              onInputChange={(_, val) => {
                setState(val);
              }}
              renderInput={(params) => 
                <TextField {...params} label='CRC Versions' variant='outlined' required />
              }
            />
          </Grid>
        );
      case 'workspaces':
        return (
          <List>
            <ListItem>
              <ListItemAvatar>
                <Avatar>
                  <VpnKey />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary='Provide the pull secret.'
                secondary={<span>Download pull secret file from <a href='https://cloud.redhat.com/openshift/install/crc/installer-provisioned'>here</a> and upload it.</span>} />
              <div className={classes.uploadLabel}>
                <input
                  accept='text/*'
                  style={{ display: 'none' }}
                  id='contained-button-file'
                  multiple
                  type='file'
                  onChange={handleUploadPullSecret}
                />
                <label htmlFor='contained-button-file'>
                  <Button variant='contained' component='span'>
                  Upload Pull Secret
                  </Button>
                </label>
              </div>
            </ListItem>
            {pullSecretPath && (
              <TextField
                id='outlined-location'
                label='Pull Secret Location'
                style={{ marginTop: '20px', width: '100%'}}
                fullWidth
                defaultValue={pullSecretPath}
                InputProps={{
                  readOnly: true,
                }}
                variant='outlined'
                size='small'
              />
            )}
          </List>
        )
      case 'serviceAcct':
        return (
          <div>
            <TextField
              id='outlined-number'
              label='CPU cores'
              type='number'
              variant='outlined'
              size='small'
              onChange={handleCpuSize}
              value={cpuSize}
              InputProps={{ inputProps: { min: 4 } }}
            />
            <TextField
              id='outlined-number'
              label='Memory to allocate'
              type='number'
              variant='outlined'
              size='small'
              onChange={handleMemory}
              value={memory}
              InputProps={{ inputProps: { min: 8192 } }}
              helperText='Value in MiB'
            />
          </div>
        )
      default:
        return 'Unknown step';
    }
  }

  const [activeStep, setActiveStep] = React.useState(0);
  const steps = getSteps();

  const handleNext = (): void => {
    if (activeStep === steps.length - 1) {
      const crcStartCommand = `${fileName} start -p ${pullSecretPath} -c ${cpuSize} -m ${memory}`;
      vscode.postMessage({action: 'run', data: crcStartCommand});
    }
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = (): void => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = (): void => {
    setActiveStep(0);
    // setVersion('');
    setBinaryPath('');
    setSecret('');
    setCpuSize(4);
    setMemory(8192);
  };

  return (
    <div className={classes.root}>
      <Paper elevation={3}>
        <Stepper activeStep={activeStep} orientation='vertical'>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
              <StepContent>
                {getStepContent(label)}
                <div className={classes.buttons}>
                  {activeStep !== 0 && (
                    <Button onClick={handleBack} className={classes.button}>
                      Back
                    </Button>
                  )}
                  <Button
                    // disabled={true}
                    variant="contained"
                    color="primary"
                    onClick={handleNext}
                    className={classes.button}
                  >
                    {activeStep === steps.length - 1 ? 'Start Pipeline' : 'Next'}
                  </Button>
                </div>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </Paper>
      {activeStep === steps.length && (
        <div>
          <Paper square elevation={3} className={classes.resetContainer}>
            {!crcProgress &&
              (<div>
                <LinearProgress />
                <Typography style={{ paddingTop: '10px'}}>
                  Setting Up the OpenShift Instance
                </Typography>
              </div>)}
            {crcProgress && (
              <span>
                <Typography style={{ paddingTop: '10px'}}>
                  OpenShift Instance is up. 
                </Typography>
                <a href='https://console-openshift-console.apps-crc.testing' style={{ textDecoration: 'none'}}>
                  <Button
                    variant='contained'
                    color='default'
                    component='span'
                    className={classes.button}
                  >
                    Open Console
                  </Button>
                </a>
              </span>)}
            {!crcProgress && crcOut && (
              <List style={{paddingTop: '5px'}}>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar>
                      <ChevronRight />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText primary={crcOut} />
                </ListItem>
              </List>)}
            <Button onClick={handleReset} className={classes.button}>
              Reset
            </Button>
          </Paper>
        </div>
      )}
    </div>
  );
}
