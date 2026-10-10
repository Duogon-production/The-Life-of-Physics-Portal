export interface ApplicationViewer {
  id: string;
  displayName: string;
  email: string;
  backend: 'clerk' | 'firebase';
}

export interface WebsiteNavigation {
  viewer: ApplicationViewer;
  organizations: { id: string; name: string }[];
  staffOrganizationIds: string[];
}
