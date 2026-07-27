"use client";

import Link from 'next/link';
import React from 'react';

export function ShimmerLink({ href, children, className, ...rest }: any) {
  return (
    <Link href={href} {...rest} className={`${className ?? ''} inline-block`}> 
      {children}
    </Link>
  );
}

export default ShimmerLink;
