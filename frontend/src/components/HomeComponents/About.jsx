import { ShieldCheck, Zap, MapPin } from "lucide-react";

function About () {

    const benefits = [
        {
        icon: MapPin,
        title: "Complete Visibility",
        description:
        "Monitor delivery progress and shipment status from one place.",
        },
        {
        icon: Zap,
        title: "Faster Operations",
        description:
        "Keep order information organized and simplify everyday delivery management.",
        },
        {
        icon: ShieldCheck,
        title: "Reliable Management",
        description:
        "Organize delivery information with a clear and consistent workflow.",
        },
    ];

    return(


        <section
            id="about"
            className="scroll-mt-20 bg-white py-6 sm:py-8"
        >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

                {/* Section Heading */}
                <div className="mx-auto max-w-2xl text-center">
                    <p className="text-lg font-semibold text-blue-600">
                    About TrackFlow
                    </p>

                    <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                        Making delivery management simpler
                    </h2>

                    <p className="mt-3 text-base leading-7 text-slate-600">
                        TrackFlow brings order management, delivery updates, and
                        operational visibility together in one easy-to-use platform.
                    </p>
                </div>


                {/* Benefits */}

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                    {benefits.map((benefit) => {
                        const Icon = benefit.icon;

                        return (
                            <div
                                key={benefit.title}
                                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
                            >
                                <div className="flex size-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                                    <Icon size={22} />
                                </div>

                                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                                    {benefit.title}
                                </h3>

                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                    {benefit.description}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>     
        </section>
    
    );


}

export default About;