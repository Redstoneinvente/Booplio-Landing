import { Link, useLocation } from "react-router-dom";
import { parseTemplateLink } from "../handoff";
import { Detail } from "./Detail";
import { Empty } from "../components/UI";
export function OpenTemplate() {
  const { search } = useLocation();
  const template = parseTemplateLink(search);
  if (!template) return <div className="content-wrap"><Empty title="This template link isn’t valid." action={<Link className="button" to="/search">Browse dents</Link>}>Choose a dent from the marketplace and try its Open in Booplio button.</Empty></div>;
  return <Detail templateId={template.id} handoff={template} />;
}
