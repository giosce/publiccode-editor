// import uk from "./uk";
import us from "./us";
import it from "./it";
import uk from "./uk";
import getFields from "./generic";

// I hope to find a better way than import everything and select as badly as below
const getAdditionalFields = () => {
  // I think additional fields should also be by organization
  if("it" == process.env.COUNTRY_FIELDS) return it;
  if("us" == process.env.COUNTRY_FIELDS) return us;
  if("uk" == process.env.COUNTRY_FIELDS) return uk;
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
  "Software Details",
  "localisation"
];
console.log("env", process.env.COUNTRY_FIELDS)

const countrySpec = [
  // {
  //   code: "uk",
  //   name: "United Kingdom",
  //   fields: uk
  // },
  // {
  //   code: "us",
  //   name: "United States",
  //   fields: us
  // },
  // {
  //   code: "it",
  //   name: "italia",
  //   fields: it
  // }
  // fields seem to be "additional fields" and I'd suggest that they
  // can be for an organization not just for a country
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
console.log("data", data)
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
