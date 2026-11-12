import { questions, rounds } from '../../../lib/questions';
export function GET(){return Response.json({questions,rounds},{headers:{'Cache-Control':'no-store'}});}
