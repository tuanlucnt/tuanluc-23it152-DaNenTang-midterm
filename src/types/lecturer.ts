export type LecturerInput = { IDGV: string; Fullname: string; Image: string; SumClass: number };
export type Lecturer = LecturerInput & { _id: string };
export type LecturerPage = {
  data: Lecturer[];
  total: number;
  page: number;
  limit: number;
  pages: number;
};
export type Session = { token: string; expiresAt: number; username: string };
