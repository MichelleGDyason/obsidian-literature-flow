import { LoadingPuff } from "./LoadingPuff"
import React from 'react'
export const PartialLoading = (props: { isLoading: boolean }) => {
    if (props.isLoading) {
        return (
            <div className="lf-no-content">
                <div>
                    <div className="lf-no-content-subtext">
                        <div className="lf-loading">
                            <LoadingPuff />
                        </div>
                    </div>
                </div>
            </div>
        )
    } else {
        return (<></>)
    }
}
