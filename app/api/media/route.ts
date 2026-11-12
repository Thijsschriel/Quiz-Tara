import { questions } from '../../../lib/questions';
export function GET(){return Response.json({images:questions.map(q=>q.image)},{headers:{'Cache-Control':'public, max-age=300'}});}
