export interface ResolutionTeamMember {
  userUid: string;
  firstName: string;
  lastName: string;
  email: string;
  addedAt: string;
}

export interface ResolutionTeam {
  uid: string;
  name: string;
  email: string | null;
  description: string | null;
  parentUid: string | null;
  parentName: string | null;
  isActive: boolean;
  canReplyToCustomer: boolean;
  hasSubteams: boolean;
  memberCount: number;
  createdAt: string;
}

export interface ResolutionTeamDetail extends ResolutionTeam {
  members: ResolutionTeamMember[];
  subTeams: ResolutionTeam[];
}

export interface CreateResolutionTeamRequest {
  name: string;
  email?: string | null;
  description?: string | null;
  /** Set to make this team a subteam of an existing team. */
  parentUid?: string | null;
  canReplyToCustomer: boolean;
}

export interface UpdateResolutionTeamRequest {
  name?: string | null;
  email?: string | null;
  description?: string | null;
  isActive?: boolean | null;
  canReplyToCustomer?: boolean | null;
}

export interface AddTeamMemberRequest {
  userUid: string;
}
