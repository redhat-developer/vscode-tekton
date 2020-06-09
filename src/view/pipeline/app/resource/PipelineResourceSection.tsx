/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/


import * as React from 'react';
import { capitalize } from 'lodash';
import { FieldArray, useField } from 'formik';
import { PipelineModalFormResource } from '../common/types';
import FormSection from '../section/FormSection';
import PipelineResourceDropdownField from './PipelineResourceDropdownField';

type ResourceSectionType = {
  formikIndex: number;
  resource: PipelineModalFormResource;
};
type ResourceSection = {
  cluster?: ResourceSectionType[];
  git?: ResourceSectionType[];
  image?: ResourceSectionType[];
  storage?: ResourceSectionType[];
};

const reduceToSections = (
  acc: ResourceSection,
  resource: PipelineModalFormResource,
  formikIndex: number,
) => {
  const resourceType = resource.data.type;

  if (!resourceType) {
    return acc;
  }

  return {
    ...acc,
    [resourceType]: [...(acc[resourceType] || []), { formikIndex, resource }],
  };
};

const PipelineResourceSection: React.FC = () => {
  const [{ value: resources }] = useField<PipelineModalFormResource[]>('resources');

  const sections: ResourceSection = resources.reduce(reduceToSections, {} as ResourceSection);
  const types = Object.keys(sections);

  return (
    <>
      {types.map((type) => (
        <FieldArray
          name={type}
          key={type}
          render={() => {
            const section = sections[type];

            return (
              <FormSection title={`${capitalize(type)} Resources`} fullWidth>
                {section.map((sectionData: ResourceSectionType) => {
                  const { formikIndex, resource } = sectionData;

                  return (
                    <PipelineResourceDropdownField
                      key={resource.name}
                      name={`resources.${formikIndex}`}
                      filterType={type}
                      label={resource.name}
                    />
                  );
                })}
              </FormSection>
            );
          }}
        />
      ))}
    </>
  );
};

export default PipelineResourceSection;
