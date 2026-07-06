export class ChangeRequestDto {
  title: string;
  description?: string;
  targetService?: string;
}

export class AnalyzeRequestDto {
  changeRequest: ChangeRequestDto;
  options?: {
    includeScreens?: boolean;
    includeIntegrations?: boolean;
    includeBusinessRules?: boolean;
    includeDocuments?: boolean;
  };
}

export class CreateJobDto {
  title: string;
  description?: string;
  targetService?: string;
}
