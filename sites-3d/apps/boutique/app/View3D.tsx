"use client";
import dynamic from "next/dynamic";
import type { ProductViewProps } from "./three/ProductView";

const ProductView = dynamic(() => import("./three/ProductView"), {
  ssr: false,
  loading: () => <div className="view-fill view-loading" aria-hidden />,
});

export const Stage = dynamic(() => import("./three/Stage"), { ssr: false });

/** Vue 3D (drei <View>) rendue dans la Canvas partagée. */
export default function View3D(props: ProductViewProps) {
  return <ProductView {...props} className={"view-fill " + (props.className ?? "")} />;
}
