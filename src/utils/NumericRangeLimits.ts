import { getGlobalFacetOptions } from "./searchUtils";
import { pathwayMetadata } from "../data/pathwayMetadata";

const globalFacetOptions = getGlobalFacetOptions(pathwayMetadata);
const temperatureOptions = globalFacetOptions["temperatureOptions"];

// Guard against an empty dataset (e.g. when every data file is excluded by
// validation): an unseeded reduce throws on an empty array. Fall back to 0 so
// the app degrades to an empty-but-functional state rather than crashing.
export const limitMinTempIncrease = temperatureOptions.length
  ? Math.min(
      0,
      Math.floor(
        temperatureOptions.reduce((min, current) =>
          current.value < min.value ? current : min,
        ).value,
      ),
    )
  : 0;

export const limitMaxTempIncrease = temperatureOptions.length
  ? Math.ceil(
      temperatureOptions.reduce((max, current) =>
        current.value > max.value ? current : max,
      ).value * 1.1,
    )
  : 0;
