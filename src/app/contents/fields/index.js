// import uk from "./uk";
import us from "./us";
import it from "./it";
import getFields from "./generic";

const getAdditionalFields = () => {
  // I think additional fields should also be by organization
  if("it" == process.env.COUNTRY_FIELDS) return it;
  if("us" == process.env.COUNTRY_FIELDS) return us;
}

const sections = [
  "Name",
  "Repository & Documentation",
  "Software Details",
  "Legal & Reuse",
  "Description & Features",
  "Logo & Screenshots",
  "Purpose & Audience",
  "Maintainance"
];

const groups = [
  "summary",
  "maintenance",
  "legal",
  "intendedAudience",
  "localisation"
];

const countrySpec = [
  {
    code: process.env.COUNTRY_CODE,
    name: process.env.COUNTRY_NAME,
    fields: getAdditionalFields()
  }
];
const available_countries = countrySpec.map(country => country.code);
const data = {
  countrySpec,
  sections,
  groups,
  available_countries
};

export const fieldsAsync = async () => {
  return await getFields();
};
export default data;

/*
Name
name, applicationSuite, genericName, localizedName

Repository & Documentation
URL, landingURL, roadmap, documentation, apiDocumentation

Software Details
version, developmentStatus, releaseDate, softwareType, inputTypes, outputTypes, isBasedOn, dependsOn

Legal & Reuse
license, authors, repoOwner, mainCopyrightOwner, codiceIPA, usedBy, awards

Description & Features
description, shortDescription, features, localizationReady, availableLanguages, it/piattaforme, it/conforme

Logo & Screenshots
logo, monochromeLogo, screenshots, videos

Purpose & Audience
scope, category, countries, unsupportedCountries

Maintainance
...

*/
