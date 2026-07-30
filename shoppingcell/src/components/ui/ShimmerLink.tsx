"use client";

import Link from 'next/link';
import React from 'react';

export function ShimmerLink({ href, children, className, ...rest }: any) {
  const linkProps = rest as Record<string, unknown>;

  return (
    <Link href={href} {...linkProps} className={`${className ?? ''} inline-block`}>
      {children}
    </Link>
  );
}

export default ShimmerLink;
