import { BinIcon, LeafIcon, HeartIcon, PawIcon, BoxIcon, BrushIcon, BookIcon, SparkIcon } from "./Icons";

const map = {
  "Bin cleaning": BinIcon,
  "Lawn & yard": LeafIcon,
  "Babysitting": HeartIcon,
  "Pet care": PawIcon,
  "Moving & hauling": BoxIcon,
  "Henna & art": BrushIcon,
  "Tutoring": BookIcon,
  "Other": SparkIcon,
};

export default function CategoryIcon({ name }) {
  const Icon = map[name] || SparkIcon;
  return <Icon />;
}
