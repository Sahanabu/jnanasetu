// Path: frontend/src/components/svg/templateMap.js
import SharingTemplate from './SharingTemplate.jsx';
import FlowTemplate from './FlowTemplate.jsx';
import TransformTemplate from './TransformTemplate.jsx';
import CompareTemplate from './CompareTemplate.jsx';
import AreaTemplate from './AreaTemplate.jsx';

export const templateMap = {
  sharing: SharingTemplate,
  flow: FlowTemplate,
  transform: TransformTemplate,
  compare: CompareTemplate,
  area: AreaTemplate,
};

export const templateNames = {
  sharing: 'Sharing Story',
  flow: 'Step by Step',
  transform: 'Transformation',
  compare: 'Comparison',
  area: 'Area Model',
};

export function getTemplateComponent(templateName) {
  return templateMap[templateName] || FlowTemplate;
}

export default templateMap;
